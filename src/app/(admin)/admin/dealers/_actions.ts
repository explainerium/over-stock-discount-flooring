"use server"

import { revalidatePath } from "next/cache"
import {
	blank,
	createDealerSchema,
	dealerIdSchema,
	dealerTermsSchema,
	inviteIdSchema,
	inviteUserSchema,
	updateDealerSchema,
	type ActionResult,
} from "@/lib/validation/dealers"
import { revokeDealerSessions } from "@/server/auth/session"
import { requireStaff } from "@/server/auth/guards"
import { inviteEmail as renderInvite, sendEmail } from "@/server/integrations/email"
import { TOKEN_TTL } from "@/server/auth/tokens"
import { audit } from "@/server/repositories/audit"
import {
	createDealer,
	getDealer,
	setDealerStatus,
	setDealerTerms,
	updateDealer,
} from "@/server/repositories/dealers"
import { emailIsTaken, issueInvite, revokeInvite } from "@/server/repositories/invites"
import { siteUrl } from "@/constants/site"

/**
 * Dealer administration.
 *
 * These orchestrate and do not calculate: check the caller, validate the input,
 * call a repository, write an audit line, revalidate. Anything with a rule in
 * it belongs under `server/domain/`.
 *
 * Every one of them starts with `requireStaff()`. A server action is a public
 * HTTP endpoint — being reachable only from a page behind a guard is not itself
 * a guard.
 */

/** Just the name, for the invite. The full record is more than this needs. */
async function getDealerName(dealerId: string): Promise<string | null> {
	const dealer = await getDealer(dealerId)
	return dealer?.companyName ?? null
}

/** Who the invite is from, as the recipient would recognize them. */
function staffName(staff: { firstName?: string | null; lastName?: string | null }): string | null {
	return [staff.firstName, staff.lastName].filter(Boolean).join(" ") || null
}

/** The invite URL as the owner will paste it. */
function inviteUrl(token: string): string {
	return siteUrl(`/invite/${token}`)
}

/**
 * Sends the invite, and still hands the link back.
 *
 * Both, not either. The owner knows these dealers personally and will often
 * want to send the link himself with a note attached — and until the domain
 * mailbox exists, the copyable link is the only one that actually arrives.
 */
async function deliverInvite(params: {
	email: string
	companyName: string
	token: string
	invitedBy?: string | null
}) {
	await sendEmail(
		renderInvite({
			companyName: params.companyName,
			inviterName: params.invitedBy,
			token: params.token,
			expiresInDays: Math.round(TOKEN_TTL.invite / (24 * 60 * 60 * 1000)),
		}),
		{ to: params.email },
	)
}

export async function createDealerAction(
	input: unknown,
): Promise<ActionResult<{ dealerId: string; inviteLink?: string }>> {
	const staff = await requireStaff()

	const parsed = createDealerSchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}
	const { inviteEmail: rawInvite, ...raw } = parsed.data
	const inviteEmail = blank(rawInvite)
	const fields = {
		companyName: raw.companyName,
		contactName: blank(raw.contactName),
		contactEmail: blank(raw.contactEmail),
		contactPhone: blank(raw.contactPhone),
		notes: blank(raw.notes),
	}

	if (inviteEmail && (await emailIsTaken(inviteEmail))) {
		return {
			ok: false,
			message: "That email already has an account.",
			field: "inviteEmail",
		}
	}

	const dealer = await createDealer(fields)
	await audit({
		entity: "Dealer",
		entityId: dealer.id,
		action: "created",
		actorId: staff.id,
		after: { companyName: dealer.companyName },
	})

	let inviteLink: string | undefined

	if (inviteEmail) {
		const invite = await issueInvite({
			email: inviteEmail,
			dealerId: dealer.id,
			invitedById: staff.id,
		})
		inviteLink = inviteUrl(invite.token)
		await deliverInvite({
			email: invite.email,
			companyName: dealer.companyName,
			token: invite.token,
			invitedBy: staffName(staff),
		})
		await audit({
			entity: "Invite",
			entityId: invite.id,
			action: "issued",
			actorId: staff.id,
			after: { email: invite.email, dealerId: dealer.id },
		})
	}

	revalidatePath("/admin/dealers")
	return { ok: true, data: { dealerId: dealer.id, inviteLink } }
}

export async function updateDealerAction(input: unknown): Promise<ActionResult> {
	const staff = await requireStaff()

	const parsed = updateDealerSchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}
	const { id, ...raw } = parsed.data
	const fields = {
		companyName: raw.companyName,
		contactName: blank(raw.contactName),
		contactEmail: blank(raw.contactEmail),
		contactPhone: blank(raw.contactPhone),
		notes: blank(raw.notes),
	}

	const dealer = await updateDealer(id, fields)
	await audit({
		entity: "Dealer",
		entityId: id,
		action: "updated",
		actorId: staff.id,
		after: { companyName: dealer.companyName },
	})

	revalidatePath(`/admin/dealers/${id}`)
	revalidatePath("/admin/dealers")
	return { ok: true, message: "Saved." }
}

/**
 * Suspends a dealer and signs its people out.
 *
 * The status change alone would not do it. A dealer whose session was issued
 * this morning would keep browsing wholesale pricing until it expired, which is
 * exactly what suspension is supposed to prevent — so the sessions go with it.
 */
export async function suspendDealerAction(input: unknown): Promise<ActionResult> {
	const staff = await requireStaff()

	const parsed = dealerIdSchema.safeParse(input)
	if (!parsed.success) return { ok: false, message: "Unknown dealer." }

	const dealer = await setDealerStatus(parsed.data.id, "SUSPENDED")
	const revoked = await revokeDealerSessions(dealer.id)

	await audit({
		entity: "Dealer",
		entityId: dealer.id,
		action: "suspended",
		actorId: staff.id,
		after: { status: "SUSPENDED", sessionsRevoked: revoked },
	})

	revalidatePath(`/admin/dealers/${dealer.id}`)
	revalidatePath("/admin/dealers")
	return {
		ok: true,
		message:
			revoked > 0
				? `${dealer.companyName} suspended. ${revoked} active session${revoked === 1 ? "" : "s"} ended.`
				: `${dealer.companyName} suspended.`,
	}
}

export async function reactivateDealerAction(input: unknown): Promise<ActionResult> {
	const staff = await requireStaff()

	const parsed = dealerIdSchema.safeParse(input)
	if (!parsed.success) return { ok: false, message: "Unknown dealer." }

	const dealer = await setDealerStatus(parsed.data.id, "ACTIVE")
	await audit({
		entity: "Dealer",
		entityId: dealer.id,
		action: "reactivated",
		actorId: staff.id,
		after: { status: "ACTIVE" },
	})

	revalidatePath(`/admin/dealers/${dealer.id}`)
	revalidatePath("/admin/dealers")
	return { ok: true, message: `${dealer.companyName} reactivated. They can sign in again.` }
}

/**
 * Issues an invitation and returns the link.
 *
 * The link comes back to the caller because it cannot be fetched later — only
 * the hash is stored. Until the client has a mailbox on his own domain and the
 * DNS records to authenticate it, this is also how invitations actually reach
 * dealers: he copies the link and sends it himself.
 */
export async function inviteUserAction(
	input: unknown,
): Promise<ActionResult<{ inviteLink: string; email: string }>> {
	const staff = await requireStaff()

	const parsed = inviteUserSchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}

	if (await emailIsTaken(parsed.data.email)) {
		return { ok: false, message: "That email already has an account.", field: "email" }
	}

	const invite = await issueInvite({
		email: parsed.data.email,
		dealerId: parsed.data.dealerId,
		invitedById: staff.id,
	})

	const dealer = await getDealerName(parsed.data.dealerId)
	if (dealer) {
		await deliverInvite({
			email: invite.email,
			companyName: dealer,
			token: invite.token,
			invitedBy: staffName(staff),
		})
	}

	await audit({
		entity: "Invite",
		entityId: invite.id,
		action: "issued",
		actorId: staff.id,
		after: { email: invite.email, dealerId: parsed.data.dealerId },
	})

	revalidatePath(`/admin/dealers/${parsed.data.dealerId}`)
	return {
		ok: true,
		data: { inviteLink: inviteUrl(invite.token), email: invite.email },
	}
}

export async function revokeInviteAction(input: unknown): Promise<ActionResult> {
	const staff = await requireStaff()

	const parsed = inviteIdSchema.safeParse(input)
	if (!parsed.success) return { ok: false, message: "Unknown invitation." }

	await revokeInvite(parsed.data.id)
	await audit({
		entity: "Invite",
		entityId: parsed.data.id,
		action: "revoked",
		actorId: staff.id,
	})

	revalidatePath("/admin/dealers")
	return { ok: true, message: "Invitation withdrawn. The link no longer works." }
}

/**
 * The commercial terms on an account.
 *
 * Every field here was already a column with no way to edit it, which meant the
 * system behaved as though every dealer were on the defaults — net 30, zone
 * freight, taxable, no minimum. For some of them that was simply wrong.
 */
export async function setDealerTermsAction(input: unknown): Promise<ActionResult> {
	const staff = await requireStaff()

	const parsed = dealerTermsSchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}

	const { dealerId, ...terms } = parsed.data
	const before = await getDealer(dealerId)
	if (!before) return { ok: false, message: "That dealer does not exist." }

	const after = await setDealerTerms(dealerId, terms)

	await audit({
		entity: "Dealer",
		entityId: dealerId,
		action: "terms:update",
		actorId: staff.id,
		before: {
			paymentTerms: before.paymentTerms,
			freightMode: before.freightMode,
			flatFreightRate: before.flatFreightRate?.toString() ?? null,
			minOrderValue: before.minOrderValue?.toString() ?? null,
			taxExempt: before.taxExempt,
			resaleCertExpiresAt: before.resaleCertExpiresAt?.toISOString() ?? null,
		},
		after: {
			paymentTerms: after.paymentTerms,
			freightMode: after.freightMode,
			flatFreightRate: after.flatFreightRate?.toString() ?? null,
			minOrderValue: after.minOrderValue?.toString() ?? null,
			taxExempt: after.taxExempt,
			resaleCertExpiresAt: after.resaleCertExpiresAt?.toISOString() ?? null,
		},
	})

	revalidatePath(`/admin/dealers/${dealerId}`)
	return { ok: true, message: "Terms updated." }
}
