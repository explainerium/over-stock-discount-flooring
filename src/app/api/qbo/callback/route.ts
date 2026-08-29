import { timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { requireStaff } from "@/server/auth/guards"
import { QboError, exchangeCode } from "@/server/integrations/quickbooks"
import { audit } from "@/server/repositories/audit"
import { saveConnection } from "@/server/repositories/quickbooks"
import { STATE_COOKIE } from "../connect/route"

/**
 * Where Intuit sends the owner back.
 *
 * The URL registered on the Intuit app must match `QBO_REDIRECT_URI` exactly,
 * including the scheme and any trailing slash — a mismatch fails at Intuit's
 * end with a message that does not say which part is wrong.
 *
 * Ends in a redirect to settings either way, with the outcome in the query
 * string, so the owner never sees a bare JSON response from a button he
 * pressed.
 */
export const dynamic = "force-dynamic"

/** Constant time, because the comparison is against a secret we issued. */
function matches(given: string, expected: string): boolean {
	const a = Buffer.from(given)
	const b = Buffer.from(expected)
	return a.length === b.length && timingSafeEqual(a, b)
}

function back(message: string): never {
	redirect(`/admin/settings?qbo=${encodeURIComponent(message)}`)
}

export async function GET(request: Request) {
	const staff = await requireStaff()

	const url = new URL(request.url)
	const code = url.searchParams.get("code")
	const realmId = url.searchParams.get("realmId")
	const state = url.searchParams.get("state")

	const jar = await cookies()
	const expected = jar.get(STATE_COOKIE)?.value
	// One use. Whether this succeeds or fails, the value is spent.
	jar.delete(STATE_COOKIE)

	if (url.searchParams.get("error")) {
		// The owner pressed Cancel on Intuit's screen, most likely. Not an error
		// worth a stack trace.
		back("QuickBooks was not connected.")
	}

	if (!expected || !state || !matches(state, expected)) {
		back("That connection link had expired. Try again from this page.")
	}

	if (!code || !realmId) {
		// `realmId` is not part of the token response and cannot be recovered
		// later — without it the tokens are valid and useless.
		back("QuickBooks did not say which company to connect to.")
	}

	try {
		const connection = await exchangeCode(code, realmId)
		await saveConnection(connection)

		await audit({
			entity: "Setting",
			entityId: "qbo_connection",
			action: "qbo:connect",
			actorId: staff.id,
			after: { realmId: connection.realmId, connectedAt: connection.connectedAt },
		})
	} catch (error) {
		if (error instanceof QboError) back(error.message)
		console.error("[qbo] callback failed", error)
		back("QuickBooks could not be connected. Try again.")
	}

	back("Connected to QuickBooks.")
}
