import "server-only"
import { db } from "@/server/db/client"
import { getOrderMailCc } from "./settings"

/**
 * Who gets told.
 *
 * Kept in one place because "who should hear about this" is a question with a
 * real answer per event, and scattering it through the actions is how a dealer
 * ends up not being told their order was rejected.
 *
 * Every one of these returns addresses that are known to be live: a disabled
 * user is disabled for a reason, and mailing them is at best noise and at worst
 * sending a dealer's pricing to somebody who left the company.
 */

export interface Recipients {
	/** The person the message is addressed to, if there is one. */
	to: string | null
	/** Everyone else who should see it. */
	cc: string[]
}

/**
 * The owner and any admins.
 *
 * A new order goes to all of them rather than to a configured address. The
 * client runs this himself today, but the moment he adds somebody at the
 * counter, that person needs to see orders without anyone editing an env var.
 */
export async function staffRecipients(): Promise<Recipients> {
	const [staff, configuredCc] = await Promise.all([
		db.user.findMany({
			where: { role: { in: ["OWNER", "ADMIN"] }, status: "ACTIVE" },
			select: { email: true, role: true },
			// The owner is the addressee; admins are copied.
			orderBy: { role: "asc" },
		}),
		// A bookkeeper or a warehouse address the owner has added. They have no
		// account here, which is the point — being copied on order mail should
		// not require one.
		getOrderMailCc(),
	])

	const owner = staff.find((user) => user.role === "OWNER") ?? staff[0]
	if (!owner) return { to: null, cc: [] }

	const cc = [
		...staff.filter((user) => user.email !== owner.email).map((user) => user.email),
		...configuredCc,
	]

	return { to: owner.email, cc: [...new Set(cc)].filter((email) => email !== owner.email) }
}

/**
 * The people at a dealer who should hear about one of their orders.
 *
 * The staff CC list rides along: the owner wants his own copy of what went to
 * the dealer, and a bookkeeper copied on order mail needs the approval as much
 * as the submission.
 *
 * Addressed to whoever acted — they are the one waiting on the answer — and
 * copied to the company contact, so a counter person's order does not go
 * unanswered while they are off for a week.
 */
export async function dealerRecipients(
	dealerId: string,
	actorId?: string | null,
): Promise<Recipients> {
	const [dealer, actor] = await Promise.all([
		db.dealer.findUnique({
			where: { id: dealerId },
			select: {
				contactEmail: true,
				users: {
					where: { status: "ACTIVE" },
					select: { email: true },
					orderBy: { createdAt: "asc" },
				},
			},
		}),
		actorId
			? db.user.findFirst({
					where: { id: actorId, status: "ACTIVE" },
					select: { email: true },
				})
			: null,
	])

	if (!dealer) return { to: null, cc: [] }

	const to = actor?.email ?? dealer.users[0]?.email ?? dealer.contactEmail ?? null
	if (!to) return { to: null, cc: [] }

	const configuredCc = await getOrderMailCc()

	const cc = [dealer.contactEmail, ...configuredCc]
		.filter((email): email is string => Boolean(email))
		.filter((email) => email !== to)

	return { to, cc: [...new Set(cc)] }
}

/** Whoever submitted an order, for naming them in the owner's notification. */
export async function orderSubmitter(orderId: string): Promise<string | null> {
	const entry = await db.orderStatusHistory.findFirst({
		where: { orderId, toStatus: "SUBMITTED" },
		select: { actor: { select: { firstName: true, lastName: true, email: true } } },
		orderBy: { createdAt: "desc" },
	})

	if (!entry?.actor) return null
	const name = [entry.actor.firstName, entry.actor.lastName].filter(Boolean).join(" ")
	return name || entry.actor.email
}
