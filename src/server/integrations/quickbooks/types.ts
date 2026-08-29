/**
 * QuickBooks Online.
 *
 * The client's own words: "we approve and then send invoice through
 * Quickbooks... Unless there is some sort of integration with QBO possible."
 * This is that integration. Nothing here charges anybody — QuickBooks issues
 * the invoice and takes the payment, exactly as it does today. What changes is
 * that the owner stops retyping an order he has already approved.
 *
 * Pure types and a pure builder, the same split as every other engine here, so
 * the part that is easy to get wrong — what an invoice line should say — is
 * testable without a connection.
 */

/**
 * A connected company.
 *
 * `realmId` is the company file. It arrives in the OAuth callback and goes into
 * the path of every subsequent API call, so losing it means the tokens are
 * useless even while they are still valid.
 *
 * Access tokens last an hour and refresh tokens a hundred days, and a refresh
 * token is reissued on every refresh. That makes this rotating state, not
 * configuration — which is why it lives in the database rather than in the
 * environment with the client id and secret.
 */
export interface QboConnection {
	realmId: string
	accessToken: string
	refreshToken: string
	/** When the access token stops working. ISO 8601. */
	accessExpiresAt: string
	/**
	 * When the refresh token does. Also ISO 8601, and the one that matters: past
	 * it the owner has to reconnect by hand, so the health check warns well
	 * before it arrives.
	 */
	refreshExpiresAt: string
	/** For the "connected as" line in admin. */
	connectedAt: string
}

/** What admin shows without having to make a call. */
export interface QboStatus {
	connected: boolean
	realmId?: string
	connectedAt?: string
	refreshExpiresAt?: string
	/** Negative once it has lapsed. */
	daysUntilReconnect?: number
	/** The sandbox company, or the client's real books. */
	environment: "sandbox" | "production"
}

/**
 * The two Items every line has to point at.
 *
 * QuickBooks will not accept an invoice line without an `ItemRef`, and the ids
 * are particular to the client's own chart of accounts — there is no sensible
 * default we could invent. So the owner names them once, and until he has, the
 * builder refuses rather than posting something his bookkeeper has to unpick.
 */
export interface QboItemRefs {
	/** Everything on the order. Per-product mapping can come later. */
	goodsItemId: string
	/** The freight line. Optional: an order can have no freight. */
	freightItemId?: string | null
}

/** One line of the payload QuickBooks expects. */
export interface QboInvoiceLine {
	Amount: number
	DetailType: "SalesItemLineDetail"
	Description?: string
	SalesItemLineDetail: {
		ItemRef: { value: string }
		Qty?: number
		UnitPrice?: number
	}
}

/**
 * The invoice body.
 *
 * Deliberately not the whole of Intuit's schema — only the fields this system
 * actually sets. Anything absent is left to the customer record in the client's
 * books, which is where his accountant already configured it.
 */
export interface QboInvoice {
	CustomerRef: { value: string }
	Line: QboInvoiceLine[]
	/** The order number, so his books and this site agree on what to call it. */
	DocNumber?: string
	/** ISO date, no time. */
	TxnDate?: string
	CustomerMemo?: { value: string }
	PrivateNote?: string
}

export class QboError extends Error {
	constructor(
		message: string,
		readonly code:
			| "NOT_CONNECTED"
			| "NO_CUSTOMER"
			| "NO_ITEM"
			| "NOTHING_TO_INVOICE"
			| "REFUSED"
			| "REFRESH_FAILED",
	) {
		super(message)
		this.name = "QboError"
	}
}
