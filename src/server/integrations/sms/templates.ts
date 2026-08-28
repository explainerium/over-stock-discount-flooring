import { siteUrl } from "@/constants/site"
import type { RenderedSms } from "./types"

/**
 * What the owner reads on a phone screen.
 *
 * Written to be understood without opening anything. He is standing on the
 * warehouse floor; the point of the message is that he learns an order exists
 * and roughly how big it is, and decides then whether it is worth walking to a
 * screen. A text that only says "you have a new order" makes him check, which
 * is the cost the alert was supposed to remove.
 *
 * A carrier bills per 160-character segment. The deep link puts these into a
 * second segment, and that is the right trade — the link is the thing that
 * turns the alert into an action.
 */

const LEAD_SOURCE: Record<string, string> = {
	CONTACT_FORM: "Contact form",
	COVERAGE_CALCULATOR: "Coverage calculator",
	SAMPLE_REQUEST: "Sample request",
	DEALER_APPLICATION: "Dealer application",
}

export function newOrderSms(data: {
	orderId: string
	orderNumber: number
	companyName: string
	lineCount: number
	total: string
}): RenderedSms {
	const lines = `${data.lineCount} ${data.lineCount === 1 ? "line" : "lines"}`

	return {
		text:
			`New order #${data.orderNumber} — ${data.companyName}, ${lines}, ${data.total}. ` +
			siteUrl(`/admin/orders/${data.orderId}`),
	}
}

export function newLeadSms(data: {
	source: string
	name?: string | null
	company?: string | null
	phone?: string | null
}): RenderedSms {
	const kind = LEAD_SOURCE[data.source] ?? "Enquiry"
	const who = data.company || data.name || "Someone"

	return {
		text: `${kind}: ${who}${data.phone ? ` — ${data.phone}` : ""}. ` + siteUrl("/admin/leads"),
	}
}
