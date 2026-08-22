import "server-only"
import { cookies } from "next/headers"
import { db } from "@/server/db/client"
import type { User } from "@/generated/prisma/client"
import { expiresAt, generateToken, hashToken, TOKEN_TTL } from "./tokens"

/**
 * Session handling.
 *
 * Sessions are database rows, not signed stateless tokens. The requirement is
 * that deactivating a dealer removes their access to pricing immediately, and a
 * self-contained token stays valid until it expires no matter what the database
 * says. A row can be deleted, and `resolveSession` re-checks the account's
 * status on every request, so a suspended dealer is locked out on their next
 * click rather than in thirty days.
 *
 * This module is the only place that touches the session cookie.
 */

export const SESSION_COOKIE = "odf_session"

function ttlMs(): number {
	const days = Number(process.env.AUTH_SESSION_DAYS)
	return Number.isInteger(days) && days > 0 ? days * 24 * 60 * 60 * 1000 : TOKEN_TTL.session
}

export interface SessionUser {
	id: string
	email: string
	firstName: string | null
	lastName: string | null
	role: User["role"]
	dealerId: string | null
	/** Null for staff. Present only when the dealer account is itself active. */
	dealerName: string | null
}

/**
 * Issues a session and sets the cookie.
 *
 * `sameSite: "lax"` rather than `strict`: the invite and password-reset links
 * arrive by email, and `strict` would drop the cookie on that first cross-site
 * navigation, landing a dealer on a login screen immediately after setting
 * their password. `lax` still blocks the cross-site POSTs that matter.
 */
export async function createSession(
	userId: string,
	meta: { userAgent?: string | null; ip?: string | null } = {},
): Promise<void> {
	const { token, tokenHash } = generateToken()
	const expiry = expiresAt(ttlMs())

	await db.session.create({
		data: {
			userId,
			tokenHash,
			expiresAt: expiry,
			userAgent: meta.userAgent ?? null,
			ip: meta.ip ?? null,
		},
	})

	const jar = await cookies()
	jar.set(SESSION_COOKIE, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		expires: expiry,
	})
}

/**
 * Resolves the current session, or null.
 *
 * Deliberately checks more than "does this row exist and has it expired":
 *
 *   - the user must still be ACTIVE, so a disabled account cannot keep browsing
 *     on a session issued before it was disabled;
 *   - a dealer user's dealer must still be ACTIVE, because suspending a company
 *     has to cut off its staff too, not just the account the owner clicked.
 *
 * An invalid session is deleted on the way past rather than left to expire.
 */
export async function resolveSession(): Promise<SessionUser | null> {
	const jar = await cookies()
	const token = jar.get(SESSION_COOKIE)?.value
	if (!token) return null

	const session = await db.session.findUnique({
		where: { tokenHash: hashToken(token) },
		include: { user: { include: { dealer: true } } },
	})

	if (!session) return null

	if (session.expiresAt.getTime() <= Date.now()) {
		await db.session.delete({ where: { id: session.id } }).catch(() => {})
		return null
	}

	const { user } = session

	if (user.status !== "ACTIVE") {
		await db.session.deleteMany({ where: { userId: user.id } })
		return null
	}

	if (user.dealerId && user.dealer?.status !== "ACTIVE") {
		await db.session.deleteMany({ where: { userId: user.id } })
		return null
	}

	return {
		id: user.id,
		email: user.email,
		firstName: user.firstName,
		lastName: user.lastName,
		role: user.role,
		dealerId: user.dealerId,
		dealerName: user.dealer?.companyName ?? null,
	}
}

/** Signs out the current browser only. Other devices stay signed in. */
export async function destroySession(): Promise<void> {
	const jar = await cookies()
	const token = jar.get(SESSION_COOKIE)?.value

	if (token) {
		await db.session.deleteMany({ where: { tokenHash: hashToken(token) } })
	}
	jar.delete(SESSION_COOKIE)
}

/**
 * Revokes every session a user holds.
 *
 * Called when an account is disabled, a dealer is suspended, or a password
 * changes — the three cases where "still logged in on their laptop" is exactly
 * what must not happen.
 */
export async function revokeAllSessions(userId: string): Promise<number> {
	const { count } = await db.session.deleteMany({ where: { userId } })
	return count
}

/** Revokes every session belonging to a dealer company. */
export async function revokeDealerSessions(dealerId: string): Promise<number> {
	const { count } = await db.session.deleteMany({ where: { user: { dealerId } } })
	return count
}

/** Housekeeping for the cron job — expired rows serve no purpose. */
export async function pruneExpiredSessions(): Promise<number> {
	const { count } = await db.session.deleteMany({
		where: { expiresAt: { lte: new Date() } },
	})
	return count
}
