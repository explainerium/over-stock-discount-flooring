import "server-only"
import { AUTHORIZE_URL, REVOKE_URL, SCOPE, TOKEN_URL } from "./endpoints"
import { QboError, type QboConnection } from "./types"

/**
 * The OAuth half.
 *
 * HTTP only — no database. Storing what comes back is the repository's job, the
 * same division the mail layer keeps between rendering a message and deciding
 * who it goes to.
 *
 * Intuit's flow is ordinary authorization-code OAuth 2.0 with one wrinkle: the
 * callback carries a `realmId` that is not part of the token response and is
 * required in the path of every subsequent API call. Dropping it on the floor
 * leaves a set of valid tokens that cannot be used for anything.
 */

function credentials(): { clientId: string; clientSecret: string; redirectUri: string } {
	const clientId = process.env.QBO_CLIENT_ID?.trim()
	const clientSecret = process.env.QBO_CLIENT_SECRET?.trim()
	const redirectUri = process.env.QBO_REDIRECT_URI?.trim()

	if (!clientId || !clientSecret || !redirectUri) {
		throw new QboError(
			"QuickBooks is not configured — QBO_CLIENT_ID, QBO_CLIENT_SECRET and QBO_REDIRECT_URI all have to be set.",
			"NOT_CONNECTED",
		)
	}

	return { clientId, clientSecret, redirectUri }
}

/** Whether it is even worth showing the Connect button. */
export function isConfigured(): boolean {
	try {
		credentials()
		return true
	} catch {
		return false
	}
}

/**
 * Where to send the owner to say yes.
 *
 * `state` is round-tripped and checked on the way back. Without it, anyone can
 * hand this site a callback URL and connect the owner's QuickBooks to an
 * attacker's app registration — the classic OAuth CSRF, and the reason the
 * parameter exists.
 */
export function authorizeUrl(state: string): string {
	const { clientId, redirectUri } = credentials()

	const params = new URLSearchParams({
		client_id: clientId,
		scope: SCOPE,
		redirect_uri: redirectUri,
		response_type: "code",
		state,
	})

	return `${AUTHORIZE_URL}?${params}`
}

/** What Intuit's token endpoint answers with. */
interface TokenResponse {
	access_token: string
	refresh_token: string
	/** Seconds. An hour, in practice. */
	expires_in: number
	/** Seconds. A hundred days, in practice. */
	x_refresh_token_expires_in: number
}

async function token(body: URLSearchParams): Promise<TokenResponse> {
	const { clientId, clientSecret } = credentials()

	const response = await fetch(TOKEN_URL, {
		method: "POST",
		headers: {
			Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
			"Content-Type": "application/x-www-form-urlencoded",
			Accept: "application/json",
		},
		body,
	})

	if (!response.ok) {
		const detail = await response.text().catch(() => "")
		throw new QboError(
			`QuickBooks refused the token request (${response.status}): ${detail}`,
			"REFRESH_FAILED",
		)
	}

	return (await response.json()) as TokenResponse
}

/**
 * Turns the two expiry windows into dates.
 *
 * Intuit sends seconds-from-now. Storing that would be storing a duration and
 * calling it a deadline, which stops being true the moment the row is read.
 */
function connectionFrom(realmId: string, tokens: TokenResponse): QboConnection {
	const now = Date.now()

	return {
		realmId,
		accessToken: tokens.access_token,
		refreshToken: tokens.refresh_token,
		accessExpiresAt: new Date(now + tokens.expires_in * 1000).toISOString(),
		refreshExpiresAt: new Date(now + tokens.x_refresh_token_expires_in * 1000).toISOString(),
		connectedAt: new Date(now).toISOString(),
	}
}

export async function exchangeCode(code: string, realmId: string): Promise<QboConnection> {
	const { redirectUri } = credentials()

	return connectionFrom(
		realmId,
		await token(
			new URLSearchParams({
				grant_type: "authorization_code",
				code,
				redirect_uri: redirectUri,
			}),
		),
	)
}

/**
 * A new pair of tokens.
 *
 * Intuit reissues the refresh token on most refreshes, so the answer has to be
 * stored every time rather than only when the access token changes. Keeping the
 * old one and letting it lapse is how an integration that has been running
 * happily for three months stops on day 101.
 *
 * `connectedAt` is carried through: the owner connected once, and a refresh is
 * not a new connection.
 */
export async function refresh(current: QboConnection): Promise<QboConnection> {
	const tokens = await token(
		new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: current.refreshToken,
		}),
	)

	return { ...connectionFrom(current.realmId, tokens), connectedAt: current.connectedAt }
}

/**
 * Hands the token back to Intuit.
 *
 * Best effort. Disconnecting has to work from this end whatever Intuit says —
 * an owner who wants the connection gone and is told "no" by a third party has
 * no way forward.
 */
export async function revoke(current: QboConnection): Promise<void> {
	const { clientId, clientSecret } = credentials()

	await fetch(REVOKE_URL, {
		method: "POST",
		headers: {
			Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: JSON.stringify({ token: current.refreshToken }),
	}).catch(() => undefined)
}
