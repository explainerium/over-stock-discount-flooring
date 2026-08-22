import { createHash, randomBytes } from "node:crypto"

/**
 * Single-use tokens: session cookies, dealer invites, password resets.
 *
 * All three follow the same shape — a long random value goes to the user, and
 * only its SHA-256 digest is stored. A leaked database backup then hands
 * someone a list of hashes rather than a set of working invite links.
 *
 * SHA-256 rather than bcrypt, deliberately. Password hashing is slow on purpose
 * because passwords are low-entropy and guessable; these are 256 bits of
 * randomness, so there is nothing to guess and no need to slow anyone down.
 * More practically, a bcrypt digest is salted and therefore different every
 * time, which makes "find the row for this token" impossible — the lookup has
 * to be an indexed equality match on a deterministic hash.
 */

/** 32 bytes → 43 url-safe characters. Fits in a cookie and in a query string. */
const TOKEN_BYTES = 32

export interface GeneratedToken {
	/** Goes to the user, in a cookie or an emailed link. Never stored. */
	token: string
	/** Goes in the database. */
	tokenHash: string
}

export function generateToken(): GeneratedToken {
	const token = randomBytes(TOKEN_BYTES).toString("base64url")
	return { token, tokenHash: hashToken(token) }
}

export function hashToken(token: string): string {
	return createHash("sha256").update(token).digest("hex")
}

/** Milliseconds, so callers read as `expiresIn(DAYS.session)` rather than raw maths. */
export const TOKEN_TTL = {
	/** Long enough that a dealer is not logging in every visit. Revocable regardless. */
	session: 30 * 24 * 60 * 60 * 1000,
	/** The owner sends these by hand; a week is enough to be answered. */
	invite: 7 * 24 * 60 * 60 * 1000,
	/** Short on purpose — a reset link sitting in an inbox is a standing key. */
	passwordReset: 60 * 60 * 1000,
} as const

export function expiresAt(ttlMs: number, from: Date = new Date()): Date {
	return new Date(from.getTime() + ttlMs)
}

export function isExpired(expiry: Date, now: Date = new Date()): boolean {
	return expiry.getTime() <= now.getTime()
}
