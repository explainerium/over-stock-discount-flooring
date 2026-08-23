"use server"

import { contactSchema, dealerApplicationSchema } from "@/lib/validation/leads"
import type { ActionResult } from "@/lib/validation/dealers"
import { createLead } from "@/server/repositories/leads"

/**
 * Public form submissions.
 *
 * These are the only actions on the site with no `requireStaff` in front of
 * them, which is the point — anyone can send a message. What protects them is
 * that they write one row and do nothing else: no email is sent from user
 * input, no account is created, nothing is read back.
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

	await createLead({
		source: "CONTACT_FORM",
		name: parsed.data.name,
		email: parsed.data.email,
		phone: parsed.data.phone,
		message: parsed.data.message,
	})

	// TODO: notify the owner. Blocked on a mailbox at the business domain plus
	// SPF, DKIM and DMARC — see the project plan. Until then the lead inbox in
	// admin is where these land.
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
	await createLead({
		source: "DEALER_APPLICATION",
		name: parsed.data.name,
		email: parsed.data.email,
		phone: parsed.data.phone,
		company: parsed.data.company,
		message: parsed.data.message,
	})

	return {
		ok: true,
		message:
			"Thanks — we have your application. We will look at it and get back to you about setting up an account.",
	}
}
