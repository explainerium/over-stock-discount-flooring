"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { db } from "@/server/db/client"
import {
	acceptInviteSchema,
	forgotPasswordSchema,
	loginSchema,
	resetPasswordSchema,
	type ActionResult,
} from "@/lib/validation/auth"
import { hashPassword, verifyPassword } from "./password"
import { createSession, destroySession, resolveSession, revokeAllSessions } from "./session"
import { expiresAt, generateToken, hashToken, isExpired, TOKEN_TTL } from "./tokens"

/**
 * Auth server actions.
 *
 * Two rules run through all of them:
 *
 *   1. Never confirm whether an account exists. Dealers here are named
 *      businesses, so "no account for that email" tells a competitor something
 *      worth knowing. Login failures are one generic message and a password
 *      reset always reports success.
 *   2. Re-validate everything. The client form uses the same zod schema, but
 *      that runs in a browser and an action is a public HTTP endpoint.
 */

/** Wrong password, no such user, disabled account — all the same sentence. */
const GENERIC_LOGIN_FAILURE = "That email and password do not match an account."

const MAX_FAILED_ATTEMPTS = 8
const LOCKOUT_MS = 15 * 60 * 1000

async function requestMeta() {
	const list = await headers()
	return {
		userAgent: list.get("user-agent"),
		// Behind Vercel the client address is the first hop in x-forwarded-for.
		ip: list.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
	}
}

/** Where a user lands after signing in. Staff and dealers do not share a home. */
function landingFor(role: string): string {
	return role === "DEALER_USER" ? "/portal" : "/admin"
}

/**
 * Only same-origin paths are honoured as a post-login destination.
 *
 * `?redirectTo=https://evil.example` on a login link is the classic open
 * redirect: the domain in the address bar is ours, so the page looks
 * trustworthy right up to the moment it forwards somewhere else.
 */
function safeRedirect(target: string | undefined, fallback: string): string {
	if (!target) return fallback
	if (!target.startsWith("/") || target.startsWith("//")) return fallback
	return target
}

export async function login(input: unknown): Promise<ActionResult> {
	const parsed = loginSchema.safeParse(input)
	if (!parsed.success) {
		return { ok: false, message: GENERIC_LOGIN_FAILURE }
	}
	const { email, password, redirectTo } = parsed.data

	const user = await db.user.findUnique({ where: { email }, include: { dealer: true } })

	// No user: still run a comparison, so a missing account and a wrong password
	// take the same amount of time. See verifyPassword's null branch.
	if (!user) {
		await verifyPassword(password, null)
		return { ok: false, message: GENERIC_LOGIN_FAILURE }
	}

	if (user.lockedUntil && !isExpired(user.lockedUntil)) {
		return {
			ok: false,
			message: "Too many failed attempts. Try again in a few minutes, or reset your password.",
		}
	}

	const valid = await verifyPassword(password, user.passwordHash)

	if (!valid) {
		const attempts = user.failedLoginAttempts + 1
		await db.user.update({
			where: { id: user.id },
			data: {
				failedLoginAttempts: attempts,
				lockedUntil:
					attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null,
			},
		})
		return { ok: false, message: GENERIC_LOGIN_FAILURE }
	}

	// Correct password, but the account or its company is not active. Same
	// message again — "your account is disabled" confirms the account exists.
	if (user.status !== "ACTIVE") return { ok: false, message: GENERIC_LOGIN_FAILURE }
	if (user.dealerId && user.dealer?.status !== "ACTIVE") {
		return { ok: false, message: GENERIC_LOGIN_FAILURE }
	}

	await db.user.update({
		where: { id: user.id },
		data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
	})

	await createSession(user.id, await requestMeta())
	redirect(safeRedirect(redirectTo, landingFor(user.role)))
}

export async function logout(): Promise<never> {
	await destroySession()
	redirect("/login")
}

/**
 * Starts a password reset.
 *
 * Always reports success, whether or not the email matches anyone. The response
 * is the same and so is roughly the work done, because otherwise this endpoint
 * becomes a way to enumerate every dealer the client has.
 */
export async function requestPasswordReset(input: unknown): Promise<ActionResult> {
	const parsed = forgotPasswordSchema.safeParse(input)
	if (!parsed.success) {
		return { ok: false, message: "Enter a valid email address." }
	}

	const user = await db.user.findUnique({ where: { email: parsed.data.email } })

	if (user && user.status === "ACTIVE") {
		const { token, tokenHash } = generateToken()

		// One live reset link at a time. An old link left working is a second
		// key to the account for as long as it lasts.
		await db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } })
		await db.passwordResetToken.create({
			data: { userId: user.id, tokenHash, expiresAt: expiresAt(TOKEN_TTL.passwordReset) },
		})

		// TODO: send the email once the domain mailbox and SPF/DKIM/DMARC exist.
		// Order mail cannot be sent from the gmail.com address on the current
		// site, so this is blocked on the client, not on us.
		if (process.env.NODE_ENV !== "production") {
			console.info(`[dev] password reset link: /reset-password/${token}`)
		}
	}

	return {
		ok: true,
		message: "If that email has an account, a reset link is on its way.",
	}
}

export async function resetPassword(input: unknown): Promise<ActionResult> {
	const parsed = resetPasswordSchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}

	const record = await db.passwordResetToken.findUnique({
		where: { tokenHash: hashToken(parsed.data.token) },
		include: { user: true },
	})

	if (!record || record.usedAt || isExpired(record.expiresAt)) {
		return {
			ok: false,
			message: "That reset link has expired or has already been used. Request a new one.",
		}
	}

	const passwordHash = await hashPassword(parsed.data.password)

	await db.$transaction([
		db.user.update({
			where: { id: record.userId },
			data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null, status: "ACTIVE" },
		}),
		db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
		// Whoever knew the old password is signed out everywhere. If the reset
		// happened because the account was compromised, leaving those sessions
		// alive would make the reset pointless.
		db.session.deleteMany({ where: { userId: record.userId } }),
	])

	await createSession(record.userId, await requestMeta())
	redirect(landingFor(record.user.role))
}

/**
 * Accepts a dealer invite.
 *
 * This is the only way an account comes into existence. There is no open
 * registration route to disable — without a valid, unused, unexpired invite
 * there is nothing here to call.
 */
export async function acceptInvite(input: unknown): Promise<ActionResult> {
	const parsed = acceptInviteSchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}
	const { token, firstName, lastName, phone, password } = parsed.data

	const invite = await db.invite.findUnique({ where: { tokenHash: hashToken(token) } })

	if (!invite || invite.usedAt || isExpired(invite.expiresAt)) {
		return {
			ok: false,
			message: "That invitation has expired or has already been used. Ask for a new one.",
		}
	}

	const existing = await db.user.findUnique({ where: { email: invite.email } })
	if (existing && existing.status === "ACTIVE") {
		return { ok: false, message: "That email already has an account. Sign in instead." }
	}

	const passwordHash = await hashPassword(password)

	const user = await db.user.upsert({
		where: { email: invite.email },
		// An invited-but-unaccepted row may already exist; completing it is the
		// same operation as creating one.
		update: {
			passwordHash,
			firstName,
			lastName,
			phone: phone || null,
			role: invite.role,
			dealerId: invite.dealerId,
			status: "ACTIVE",
		},
		create: {
			email: invite.email,
			passwordHash,
			firstName,
			lastName,
			phone: phone || null,
			role: invite.role,
			dealerId: invite.dealerId,
			status: "ACTIVE",
		},
	})

	await db.invite.update({ where: { id: invite.id }, data: { usedAt: new Date() } })

	// The first user activating a company activates the company with it.
	if (invite.dealerId) {
		await db.dealer.updateMany({
			where: { id: invite.dealerId, status: "PENDING" },
			data: { status: "ACTIVE" },
		})
	}

	await createSession(user.id, await requestMeta())
	redirect(landingFor(user.role))
}

/** Signs a user out everywhere. Used when staff disable an account. */
export async function forceSignOut(userId: string): Promise<number> {
	const actor = await resolveSession()
	if (!actor || (actor.role !== "OWNER" && actor.role !== "ADMIN")) {
		throw new Error("Not permitted.")
	}
	return revokeAllSessions(userId)
}
