import "server-only"
import { db } from "@/server/db/client"
import type { CustomerType, LeadSource } from "@/generated/prisma/client"

/**
 * Leads.
 *
 * A dealer application is a lead, not an account. The owner reads it, decides,
 * and sends an invite — which keeps "dealers cannot self-register" true while
 * still giving the public site a way to feed the dealer network he wants to
 * grow from ten to a hundred.
 */
export async function createLead(data: {
	source: LeadSource
	name?: string
	email?: string
	phone?: string
	company?: string
	message?: string
	productId?: string
	calculatorSqFt?: string
	shipTo?: string
	customerType?: CustomerType
	zip?: string
}) {
	return db.lead.create({
		data: {
			source: data.source,
			name: data.name ?? null,
			email: data.email ?? null,
			phone: data.phone ?? null,
			company: data.company ?? null,
			message: data.message ?? null,
			productId: data.productId ?? null,
			calculatorSqFt: data.calculatorSqFt ?? null,
			shipTo: data.shipTo ?? null,
			customerType: data.customerType ?? null,
			zip: data.zip ?? null,
		},
		select: { id: true, source: true },
	})
}

export async function listLeads(options: { handled?: boolean } = {}) {
	return db.lead.findMany({
		where:
			options.handled === undefined
				? {}
				: { handledAt: options.handled ? { not: null } : null },
		select: {
			id: true,
			source: true,
			name: true,
			email: true,
			phone: true,
			company: true,
			message: true,
			calculatorSqFt: true,
			shipTo: true,
			customerType: true,
			zip: true,
			handledAt: true,
			createdAt: true,
			product: { select: { name: true, slug: true, sku: true } },
		},
		orderBy: { createdAt: "desc" },
	})
}

export async function countUnhandledLeads(): Promise<number> {
	return db.lead.count({ where: { handledAt: null } })
}

export async function setLeadHandled(id: string, handled: boolean) {
	return db.lead.update({
		where: { id },
		data: { handledAt: handled ? new Date() : null },
		select: { id: true },
	})
}
