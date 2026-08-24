"use server"

import { contactSchema, dealerApplicationSchema, sampleRequestSchema } from "@/lib/validation/leads"
import type { ActionResult } from "@/lib/validation/dealers"
import { notifyNewLead } from "@/server/notifications/orders"
import { createLead } from "@/server/repositories/leads"
import { getProductName } from "@/server/repositories/catalog"

/**
 * Public form submissions.
 *
 * These are the only actions on the site with no `requireStaff` in front of
 * them, which is the point — anyone can send a message.
 *
 * They write a row and notify the owner, and nothing else: no account is
 * created, no dealer data is read back, and the notification goes to staff
 * only, with everything the sender typed escaped on the way in.
 *
 * That notification is the one thing here a stranger can make the server do,
 * so it is capped — see `notifyNewLead`. The honeypot below stops the naive
 * bots; the cap is what stops the rest from emptying a mail quota.
 */

/** Filled in only by something that fills in everything. */
function isBot(website: string | undefined): boolean {
	return Boolean(website && website.length > 0)
}

export async function submitContactAction(input: unknown): Promise<ActionResult> {
	const parsed = contactSchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}

	// Report success to a bot rather than an error. Telling it what tripped the
	// filter is how the filter stops working.
	if (isBot(parsed.data.website)) {
		return { ok: true, message: "Thanks — we will be in touch." }
	}

	const lead = {
		source: "CONTACT_FORM" as const,
		name: parsed.data.name,
		email: parsed.data.email,
		phone: parsed.data.phone,
		message: parsed.data.message,
	}

	await createLead(lead)
	await notifyNewLead(lead)

	return {
		ok: true,
		message: "Thanks — we have your message and will be in touch.",
	}
}

export async function submitDealerApplicationAction(input: unknown): Promise<ActionResult> {
	const parsed = dealerApplicationSchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}

	if (isBot(parsed.data.website)) {
		return { ok: true, message: "Thanks — we will review your application." }
	}

	// A lead, never an account. The owner reads it and sends an invite if he
	// wants to, which is what keeps invite-only true.
	const lead = {
		source: "DEALER_APPLICATION" as const,
		name: parsed.data.name,
		email: parsed.data.email,
		phone: parsed.data.phone,
		company: parsed.data.company,
		message: parsed.data.message,
	}

	await createLead(lead)
	await notifyNewLead(lead)

	return {
		ok: true,
		message:
			"Thanks — we have your application. We will look at it and get back to you about setting up an account.",
	}
}

/**
 * A sample request.
 *
 * A lead like the others, with the product and the address attached. Fulfilment
 * stays manual in Phase 1 — nothing here reserves stock or creates an order.
 */
export async function requestSampleAction(input: unknown): Promise<ActionResult> {
	const parsed = sampleRequestSchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}

	if (isBot(parsed.data.website)) {
		return { ok: true, message: "Thanks — we will be in touch." }
	}

	const product = await getProductName(parsed.data.productId)
	if (!product) return { ok: false, message: "That colour is no longer listed." }

	const lead = {
		source: "SAMPLE_REQUEST" as const,
		name: parsed.data.name,
		email: parsed.data.email,
		phone: parsed.data.phone,
		message: parsed.data.message,
		productId: parsed.data.productId,
		shipTo: parsed.data.address,
	}

	await createLead(lead)
	await notifyNewLead({ ...lead, productName: product })

	return { ok: true, message: "Thanks — we have your request." }
}
