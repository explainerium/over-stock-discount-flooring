import "server-only"
import { piecesOf } from "@/lib/format/sold-by"
import { db } from "@/server/db/client"
import {
	QboError,
	buildInvoice,
	companyName,
	createInvoice,
	environment,
	refresh,
	revoke,
	type InvoiceableLine,
	type QboConnection,
	type QboItemRefs,
	type QboStatus,
} from "@/server/integrations/quickbooks"
import { formatAddress, type AddressParts } from "@/server/domain/addresses"

/**
 * The QuickBooks connection, and the one call that uses it.
 *
 * Tokens live in the `Setting` table. That table's own note says secrets belong
 * in the environment, and this is the exception it did not anticipate: a
 * refresh token is reissued on every refresh and expires a hundred days after
 * the last one, so it is rotating state rather than configuration. There is
 * nowhere in an environment variable for a value the application rewrites.
 *
 * The client id and secret do stay in the environment, where they belong.
 */

const KEYS = {
	connection: "qbo_connection",
	items: "qbo_items",
} as const

async function readSetting<T>(key: string): Promise<T | null> {
	const row = await db.setting.findUnique({ where: { key }, select: { value: true } })
	if (!row || row.value === null || typeof row.value !== "object") return null
	return row.value as T
}

async function writeSetting(key: string, value: object): Promise<void> {
	await db.setting.upsert({
		where: { key },
		create: { key, value: value as never },
		update: { value: value as never },
	})
}

export async function getConnection(): Promise<QboConnection | null> {
	const stored = await readSetting<QboConnection>(KEYS.connection)
	// A half-written row is treated as no connection rather than as a broken
	// one. Everything downstream then takes the "not connected" path, which is
	// already written and already correct.
	return stored?.realmId && stored.refreshToken ? stored : null
}

export async function saveConnection(connection: QboConnection): Promise<void> {
	await writeSetting(KEYS.connection, connection)
}

/** Disconnects here first, and tells Intuit second. */
export async function clearConnection(): Promise<void> {
	const current = await getConnection()
	await db.setting.deleteMany({ where: { key: KEYS.connection } })
	if (current) await revoke(current)
}

export async function getItemRefs(): Promise<QboItemRefs | null> {
	const stored = await readSetting<QboItemRefs>(KEYS.items)
	return stored?.goodsItemId ? stored : null
}

export async function setItemRefs(items: QboItemRefs): Promise<void> {
	await writeSetting(KEYS.items, items)
}

/** Days from now to a date, floored. Negative once it has passed. */
function daysUntil(iso: string): number {
	return Math.floor((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
}

export async function qboStatus(): Promise<QboStatus> {
	const connection = await getConnection()
	if (!connection) return { connected: false, environment: environment() }

	return {
		connected: true,
		environment: environment(),
		realmId: connection.realmId,
		connectedAt: connection.connectedAt,
		refreshExpiresAt: connection.refreshExpiresAt,
		daysUntilReconnect: daysUntil(connection.refreshExpiresAt),
	}
}

/**
 * A connection with an access token that will still be good in a minute.
 *
 * Refreshed five minutes early rather than on expiry. A token that passes the
 * check and then expires mid-request produces a 401 on an invoice that has
 * already been approved, which is the most confusing failure this integration
 * has available to it.
 */
const REFRESH_MARGIN_MS = 5 * 60 * 1000

export async function activeConnection(): Promise<QboConnection> {
	const current = await getConnection()
	if (!current) {
		throw new QboError("QuickBooks is not connected.", "NOT_CONNECTED")
	}

	if (new Date(current.accessExpiresAt).getTime() - Date.now() > REFRESH_MARGIN_MS) {
		return current
	}

	const renewed = await refresh(current)
	// Saved before it is used. Intuit reissues the refresh token on most
	// refreshes and invalidates the old one immediately, so a crash between
	// refreshing and saving would leave the stored token dead and the owner
	// reconnecting by hand.
	await saveConnection(renewed)
	return renewed
}

/** What an invoice attempt did, so the caller can say so without catching. */
export type InvoiceResult =
	{ ok: true; invoiceId: string; alreadySent: boolean } | { ok: false; reason: string }

/**
 * The approved order, as an invoice in the client's books.
 *
 * Returns a result rather than throwing, for the same reason the freight engine
 * does: by the time this runs the order is already approved and the dealer has
 * already been told. A QuickBooks outage must not undo that — it should leave
 * the owner a message and an order he can invoice by hand, which is what he
 * does today anyway.
 *
 * Idempotent on `qboInvoiceId`. An order that already has one is never sent
 * again, so a retry after a partial failure cannot double-invoice a dealer.
 */
export async function raiseInvoice(orderId: string): Promise<InvoiceResult> {
	try {
		const order = await db.order.findUnique({
			where: { id: orderId },
			select: {
				orderNumber: true,
				qboInvoiceId: true,
				approvedAt: true,
				freight: true,
				tax: true,
				shipToSnapshot: true,
				dealer: { select: { companyName: true, qboCustomerId: true } },
				items: {
					select: {
						productNameSnapshot: true,
						productSkuSnapshot: true,
						unitPrice: true,
						lineTotal: true,
						boxes: true,
						sqFt: true,
						qtyBase: true,
						uomBase: true,
						product: { select: { pricingUom: true } },
					},
					orderBy: { sortOrder: "asc" },
				},
			},
		})

		if (!order) return { ok: false, reason: "That order no longer exists." }

		if (order.qboInvoiceId) {
			return { ok: true, invoiceId: order.qboInvoiceId, alreadySent: true }
		}

		const items = await getItemRefs()
		if (!items) {
			return {
				ok: false,
				reason: "No QuickBooks items are set yet, so there is nothing to bill the lines against.",
			}
		}

		const snapshot = order.shipToSnapshot as AddressParts | null

		const lines: InvoiceableLine[] = order.items.map((item) => ({
			name: item.productNameSnapshot,
			sku: item.productSkuSnapshot,
			pricingUom: item.product.pricingUom,
			unitPrice: item.unitPrice.toString(),
			amount: item.lineTotal.toString(),
			boxes: item.boxes,
			sqFt: item.sqFt?.toString() ?? null,
			pieces: piecesOf(item),
		}))

		const invoice = buildInvoice(
			{
				orderNumber: order.orderNumber,
				// The day it was approved, not today. A retry a week later must
				// not date the invoice a week late.
				txnDate: (order.approvedAt ?? new Date()).toISOString().slice(0, 10),
				companyName: order.dealer.companyName,
				qboCustomerId: order.dealer.qboCustomerId,
				lines,
				freight: order.freight.toString(),
				tax: order.tax.toString(),
				shipTo: snapshot ? formatAddress(snapshot) : null,
			},
			items,
		)

		const invoiceId = await createInvoice(await activeConnection(), invoice)

		await db.order.update({ where: { id: orderId }, data: { qboInvoiceId: invoiceId } })

		return { ok: true, invoiceId, alreadySent: false }
	} catch (error) {
		if (error instanceof QboError) return { ok: false, reason: error.message }

		console.error(`[qbo] could not invoice order ${orderId}`, error)
		return { ok: false, reason: "QuickBooks did not answer. The order is approved either way." }
	}
}

/**
 * Proves the connection still works, rather than that a token has not expired.
 *
 * The two come apart when somebody disconnects the app from inside QuickBooks:
 * the stored tokens look fine and every call is rejected. Only a real request
 * tells them apart.
 */
export async function checkConnection(): Promise<{ ok: boolean; detail: string }> {
	try {
		const name = await companyName(await activeConnection())
		return { ok: true, detail: name ? `Connected to ${name}.` : "Connected." }
	} catch (error) {
		return {
			ok: false,
			detail: error instanceof QboError ? error.message : "QuickBooks did not answer.",
		}
	}
}
