/**
 * Where QuickBooks lives.
 *
 * OAuth runs against the same two hosts in both environments — Intuit
 * authorises against production regardless, and the sandbox company is chosen
 * by which company the person picks when they connect. Only the accounting API
 * has separate hosts, which is the trap: pointing the API at production while
 * testing writes invoices into the client's real books.
 *
 * Kept in one file so that trap is visible in one place rather than inferred
 * from a string concatenation three modules away.
 */

export const AUTHORIZE_URL = "https://appcenter.intuit.com/connect/oauth2"
export const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
export const REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke"

/** The only scope this needs. Asking for more is a worse consent screen for nothing. */
export const SCOPE = "com.intuit.quickbooks.accounting"

/**
 * Which books.
 *
 * Defaults to sandbox. A missing or misspelt variable must not send an invoice
 * to a real company — the failure of writing to the sandbox by mistake is a
 * confused developer, and the failure the other way is the client's accounts.
 */
export function environment(): "sandbox" | "production" {
	return process.env.QBO_ENVIRONMENT?.trim() === "production" ? "production" : "sandbox"
}

export function apiBase(): string {
	return environment() === "production"
		? "https://quickbooks.api.intuit.com"
		: "https://sandbox-quickbooks.api.intuit.com"
}

/**
 * The API version to pin.
 *
 * Intuit ships breaking changes behind `minorversion`. Not sending one means
 * taking whatever they make current, which is how an integration that worked
 * for a year stops on a Tuesday.
 */
export const MINOR_VERSION = "75"

export function invoiceUrl(realmId: string): string {
	return `${apiBase()}/v3/company/${encodeURIComponent(realmId)}/invoice?minorversion=${MINOR_VERSION}`
}

/** The cheapest authenticated call there is — used to prove the connection works. */
export function companyInfoUrl(realmId: string): string {
	return `${apiBase()}/v3/company/${encodeURIComponent(realmId)}/companyinfo/${encodeURIComponent(realmId)}?minorversion=${MINOR_VERSION}`
}
