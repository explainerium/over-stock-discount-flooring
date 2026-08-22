import "server-only"
import { db } from "@/server/db/client"
import { expiresAt, generateToken, TOKEN_TTL } from "@/server/auth/tokens"

/**
 * Dealer invites.
 *
 * The raw token exists for exactly one moment — inside `issueInvite`, on its
 * way back to the caller. Only its hash is written, so once the response has
 * been rendered the link cannot be recovered from anywhere. Regenerating is the
 * only way to produce another, and that deliberately invalidates the first.
 */

export interface IssuedInvite {
	id: string
	email: string
	/** The one-time link. Show it to the owner now or it is gone. */
	token: string
	expiresAt: Date
}

export async function issueInvite(params: {
	email: string
	dealerId: string
	invitedById: string
}): Promise<IssuedInvite> {
	const { token, tokenHash } = generateToken()
	const expiry = expiresAt(TOKEN_TTL.invite)

	// One live invite per address. Leaving older ones working would mean a
	// forwarded email from three weeks ago still opens an account.
	await db.invite.deleteMany({
		where: { email: params.email, dealerId: params.dealerId, usedAt: null },
	})

	const invite = await db.invite.create({
		data: {
			email: params.email,
			dealerId: params.dealerId,
			invitedById: params.invitedById,
			tokenHash,
			expiresAt: expiry,
			role: "DEALER_USER",
		},
		select: { id: true, email: true, expiresAt: true },
	})

	return { ...invite, token }
}

/** Withdraws an invitation that has not been accepted. */
export async function revokeInvite(id: string): Promise<void> {
	await db.invite.deleteMany({ where: { id, usedAt: null } })
}

export async function getInvite(id: string) {
	return db.invite.findUnique({
		where: { id },
		select: { id: true, email: true, dealerId: true, usedAt: true },
	})
}

/**
 * Is this address already spoken for?
 *
 * A user row may exist in INVITED state without a password, which is not a
 * conflict — it is the same person being re-invited. An ACTIVE row is.
 */
export async function emailIsTaken(email: string): Promise<boolean> {
	const user = await db.user.findUnique({
		where: { email },
		select: { status: true },
	})
	return user?.status === "ACTIVE"
}
