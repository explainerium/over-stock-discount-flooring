import "server-only"
import { db } from "@/server/db/client"
import type { DealerStatus, Prisma } from "@/generated/prisma/client"

/**
 * Dealer reads and writes.
 *
 * Repositories are the only place Prisma is called. Two things follow from
 * that, and they are the reason the layer exists rather than actions querying
 * directly:
 *
 *   - Anything dealer-scoped takes the scope as an argument. A function that
 *     worked out for itself whose data to return would be one refactor away
 *     from returning everyone's.
 *   - Selects are explicit. `include: { user: true }` on a dealer would carry
 *     password hashes into a React component and, from there, into the HTML
 *     payload sent to the browser.
 */

/** Fields safe to send to a client component. No password hash, no lockout state. */
const publicUserSelect = {
	id: true,
	email: true,
	firstName: true,
	lastName: true,
	phone: true,
	role: true,
	status: true,
	lastLoginAt: true,
	createdAt: true,
} satisfies Prisma.UserSelect

export type DealerListItem = Awaited<ReturnType<typeof listDealers>>[number]
export type DealerDetail = NonNullable<Awaited<ReturnType<typeof getDealer>>>

export async function listDealers(search?: string) {
	return db.dealer.findMany({
		where: search
			? {
					OR: [
						{ companyName: { contains: search, mode: "insensitive" } },
						{ contactName: { contains: search, mode: "insensitive" } },
						{ contactEmail: { contains: search, mode: "insensitive" } },
					],
				}
			: undefined,
		select: {
			id: true,
			companyName: true,
			contactName: true,
			contactEmail: true,
			status: true,
			createdAt: true,
			_count: { select: { users: true, orders: true } },
		},
		orderBy: [{ status: "asc" }, { companyName: "asc" }],
	})
}

export async function getDealer(id: string) {
	return db.dealer.findUnique({
		where: { id },
		select: {
			id: true,
			companyName: true,
			contactName: true,
			contactEmail: true,
			contactPhone: true,
			notes: true,
			status: true,
			paymentTerms: true,
			freightMode: true,
			taxExempt: true,
			createdAt: true,
			users: { select: publicUserSelect, orderBy: { createdAt: "asc" } },
			invites: {
				where: { usedAt: null },
				select: { id: true, email: true, expiresAt: true, createdAt: true },
				orderBy: { createdAt: "desc" },
			},
		},
	})
}

export async function createDealer(data: {
	companyName: string
	contactName?: string
	contactEmail?: string
	contactPhone?: string
	notes?: string
}) {
	return db.dealer.create({
		// PENDING until someone actually accepts an invite. A company with no
		// users who can sign in is not an active dealer, whatever the record says.
		data: { ...data, status: "PENDING" },
		select: { id: true, companyName: true },
	})
}

export async function updateDealer(
	id: string,
	data: {
		companyName: string
		contactName?: string
		contactEmail?: string
		contactPhone?: string
		notes?: string
	},
) {
	return db.dealer.update({
		where: { id },
		data: {
			companyName: data.companyName,
			contactName: data.contactName ?? null,
			contactEmail: data.contactEmail ?? null,
			contactPhone: data.contactPhone ?? null,
			notes: data.notes ?? null,
		},
		select: { id: true, companyName: true },
	})
}

export async function setDealerStatus(id: string, status: DealerStatus) {
	return db.dealer.update({
		where: { id },
		data: { status },
		select: { id: true, companyName: true, status: true },
	})
}

/** Used to decide whether activating a dealer is even meaningful yet. */
export async function countActiveUsers(dealerId: string): Promise<number> {
	return db.user.count({ where: { dealerId, status: "ACTIVE" } })
}
