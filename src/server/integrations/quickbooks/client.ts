import "server-only"
import { companyInfoUrl, invoiceUrl } from "./endpoints"
import { QboError, type QboConnection, type QboInvoice } from "./types"

/**
 * Talking to the accounting API.
 *
 * HTTP only. It takes a connection rather than fetching one, so nothing here
 * has to know where tokens are kept and the whole file can be reasoned about
 * without a database.
 *
 * No SDK. What this needs is two authenticated POSTs and a GET, and Intuit's
 * own client library brings a dependency tree, its own token storage and its
 * own opinions about retries — all of which this codebase already has answers
 * for.
 */

async function call(
	url: string,
	connection: QboConnection,
	init?: { method: "POST"; body: unknown },
): Promise<unknown> {
	const response = await fetch(url, {
		method: init?.method ?? "GET",
		headers: {
			Authorization: `Bearer ${connection.accessToken}`,
			Accept: "application/json",
			...(init ? { "Content-Type": "application/json" } : {}),
		},
		body: init ? JSON.stringify(init.body) : undefined,
	})

	if (!response.ok) {
		// Intuit puts the fault — which item id was wrong, which customer does
		// not exist — in the body. The status line on its own is never enough to
		// act on.
		const detail = await response.text().catch(() => "")
		throw new QboError(
			`QuickBooks refused the request (${response.status}): ${detail}`,
			"REFUSED",
		)
	}

	return response.json()
}

/** What comes back from a successful invoice create, narrowed to what is used. */
interface InvoiceResponse {
	Invoice?: { Id?: string; DocNumber?: string }
}

/**
 * Creates the invoice, and returns its QuickBooks id.
 *
 * The id is what makes this idempotent from the outside: it goes on the order,
 * and an order that already has one is never sent again.
 */
export async function createInvoice(
	connection: QboConnection,
	invoice: QboInvoice,
): Promise<string> {
	const body = (await call(invoiceUrl(connection.realmId), connection, {
		method: "POST",
		body: invoice,
	})) as InvoiceResponse

	const id = body.Invoice?.Id
	if (!id) {
		// Accepted but unrecognisable. Better to say so than to record success
		// with nothing to point at — an invoice we cannot name is one nobody can
		// find again.
		throw new QboError("QuickBooks accepted the invoice but returned no id.", "REFUSED")
	}

	return id
}

/**
 * The cheapest authenticated call there is.
 *
 * Used to prove a connection actually works, rather than that a token has not
 * expired yet — the two come apart when somebody disconnects the app from
 * inside QuickBooks, which leaves valid-looking tokens that every call rejects.
 */
export async function companyName(connection: QboConnection): Promise<string | null> {
	const body = (await call(companyInfoUrl(connection.realmId), connection)) as {
		CompanyInfo?: { CompanyName?: string }
	}

	return body.CompanyInfo?.CompanyName ?? null
}
