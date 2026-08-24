import { escape, facts, h, p, quote, wrap } from "./layout"
import type { RenderedEmail } from "./types"

/**
 * The messages.
 *
 * Pure functions of plain data — no Prisma types, no `next/*` — so they can be
 * rendered in a test and read as a dealer would receive them.
 *
 * Two rules run through all of them. Nothing here says "purchase", "checkout"
 * or "payment": an order is a request, the owner approves it, and QuickBooks
 * invoices it, and wording that implies otherwise sets an expectation the
 * system will not meet. And every message that reports a decision carries the
 * reason with it, because the reason is what the dealer would otherwise ring up
 * to ask for.
 */

function siteUrl(path: string): string {
	const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
	return `${base}${path}`
}

const SIGN_OFF = "Overstock Discount Flooring, High Point NC"

/** "1 hour", "7 days". A link that works for "1 hours" reads as a bug. */
function period(count: number, unit: string): string {
	return `${count} ${unit}${count === 1 ? "" : "s"}`
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export function inviteEmail(data: {
	companyName: string
	inviterName?: string | null
	token: string
	expiresInDays: number
}): RenderedEmail {
	const link = siteUrl(`/invite/${data.token}`)
	const from = data.inviterName ? `${data.inviterName} at Overstock` : "Overstock"

	return {
		subject: `Your Overstock dealer account for ${data.companyName}`,
		text: [
			`${from} has set up a dealer account for ${data.companyName}.`,
			``,
			`Set your password and you can see your pricing, build orders and track them through:`,
			link,
			``,
			`The link works for ${period(data.expiresInDays, "day")}. If it expires, ask us for another.`,
			``,
			SIGN_OFF,
		].join("\n"),
		html: wrap(
			h(`Your dealer account is ready`) +
				p(
					`${escape(from)} has set up an account for <strong>${escape(data.companyName)}</strong>.`,
				) +
				p(
					`Set a password and you can see your pricing, build orders and follow them through to delivery.`,
				),
			{
				action: { label: "Set your password", href: link },
				footnote: `This link works for ${period(data.expiresInDays, "day")}. If it expires, ask us for another.`,
			},
		),
	}
}

export function passwordResetEmail(data: { token: string; expiresInHours: number }): RenderedEmail {
	const link = siteUrl(`/reset-password/${data.token}`)

	return {
		subject: "Reset your Overstock password",
		text: [
			`Somebody asked to reset the password on your Overstock dealer account.`,
			``,
			link,
			``,
			`The link works for ${period(data.expiresInHours, "hour")} and can be used once.`,
			`If this was not you, ignore this — your password has not changed.`,
			``,
			SIGN_OFF,
		].join("\n"),
		html: wrap(
			h("Reset your password") +
				p(`Somebody asked to reset the password on your dealer account.`),
			{
				action: { label: "Choose a new password", href: link },
				footnote: `This link works for ${period(data.expiresInHours, "hour")} and can be used once. If this was not you, ignore it — your password has not changed.`,
			},
		),
	}
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export interface OrderSummary {
	orderId: string
	orderNumber: number
	companyName: string
	lineCount: number
	total: string
	shipTo?: string | null
}

function orderFacts(order: OrderSummary): [string, string][] {
	return [
		["Order", `#${order.orderNumber}`],
		["Lines", `${order.lineCount}`],
		["Total", order.total],
		...((order.shipTo ? [["Ship to", escape(order.shipTo)]] : []) as [string, string][]),
	]
}

function orderTextFacts(order: OrderSummary): string[] {
	return [
		`Order:   #${order.orderNumber}`,
		`Lines:   ${order.lineCount}`,
		`Total:   ${order.total}`,
		...(order.shipTo ? [`Ship to: ${order.shipTo}`] : []),
	]
}

/** To the owner. The one that has to reach him while he is on a forklift. */
export function orderSubmittedEmail(data: {
	order: OrderSummary
	submittedBy: string
	dealerNotes?: string | null
}): RenderedEmail {
	const link = siteUrl(`/admin/orders/${data.order.orderId}`)

	return {
		subject: `New order #${data.order.orderNumber} — ${data.order.companyName}`,
		text: [
			`${data.submittedBy} at ${data.order.companyName} has sent an order for approval.`,
			``,
			...orderTextFacts(data.order),
			...(data.dealerNotes ? ["", `Their note: ${data.dealerNotes}`] : []),
			``,
			`Approve, change or decline it here:`,
			link,
			``,
			`Freight has not been quoted yet.`,
		].join("\n"),
		html: wrap(
			h(`${escape(data.order.companyName)} sent an order`) +
				p(`${escape(data.submittedBy)} submitted it for your approval.`) +
				facts(orderFacts(data.order)) +
				(data.dealerNotes ? quote(data.dealerNotes) : ""),
			{
				action: { label: "Open the order", href: link },
				footnote: "Freight has not been quoted yet.",
			},
		),
	}
}

/** To the dealer. */
export function orderApprovedEmail(data: {
	order: OrderSummary
	freight: string
	note?: string | null
}): RenderedEmail {
	const link = siteUrl(`/portal/orders/${data.order.orderId}`)

	return {
		subject: `Order #${data.order.orderNumber} approved`,
		text: [
			`We have approved your order.`,
			``,
			...orderTextFacts(data.order),
			`Freight:  ${data.freight}`,
			...(data.note ? ["", data.note] : []),
			``,
			`An invoice will follow through QuickBooks as usual. Nothing is charged here.`,
			``,
			link,
			``,
			SIGN_OFF,
		].join("\n"),
		html: wrap(
			h(`Order #${data.order.orderNumber} is approved`) +
				facts([...orderFacts(data.order), ["Freight", data.freight]]) +
				(data.note ? quote(data.note) : "") +
				p(`An invoice will follow through QuickBooks as usual.`),
			{
				action: { label: "See the order", href: link },
				footnote: "Nothing is charged on the website. Payment runs through QuickBooks.",
			},
		),
	}
}

/** To the dealer, with the reason — which is the whole point of the message. */
export function changesRequestedEmail(data: {
	order: OrderSummary
	reason: string
}): RenderedEmail {
	const link = siteUrl(`/portal/orders/${data.order.orderId}`)

	return {
		subject: `Order #${data.order.orderNumber} — we need a change`,
		text: [
			`We have asked for a change before order #${data.order.orderNumber} can go ahead:`,
			``,
			data.reason,
			``,
			`You can edit the order and send it back from here:`,
			link,
			``,
			SIGN_OFF,
		].join("\n"),
		html: wrap(
			h(`We need a change to order #${data.order.orderNumber}`) +
				quote(data.reason) +
				p(`Edit the order and send it back whenever you are ready.`),
			{ action: { label: "Open the order", href: link } },
		),
	}
}

export function orderRejectedEmail(data: { order: OrderSummary; reason: string }): RenderedEmail {
	const link = siteUrl(`/portal/orders/${data.order.orderId}`)

	return {
		subject: `Order #${data.order.orderNumber} — we cannot take this one`,
		text: [
			`We were not able to take order #${data.order.orderNumber}.`,
			``,
			data.reason,
			``,
			`Call us on (843) 318-9675 if you want to work something out.`,
			``,
			link,
			``,
			SIGN_OFF,
		].join("\n"),
		html: wrap(
			h(`We cannot take order #${data.order.orderNumber}`) +
				quote(data.reason) +
				p(`Call us on (843) 318-9675 if you want to work something out.`),
			{ action: { label: "See the order", href: link } },
		),
	}
}

/**
 * To the dealer, when it ships.
 *
 * The plan calls this the notification that removes "where's my order?" calls,
 * so the tracking details are the message — they come before anything else and
 * they are in the plain-text part too, where they can be copied.
 */
export function orderShippedEmail(data: {
	order: OrderSummary
	bolNumber?: string | null
	proNumber?: string | null
	trackingUrl?: string | null
	carrier?: string | null
}): RenderedEmail {
	const link = data.trackingUrl ?? siteUrl(`/portal/orders/${data.order.orderId}`)

	const rows: [string, string][] = [
		["Order", `#${data.order.orderNumber}`],
		...((data.carrier ? [["Carrier", escape(data.carrier)]] : []) as [string, string][]),
		...((data.proNumber ? [["PRO", escape(data.proNumber)]] : []) as [string, string][]),
		...((data.bolNumber ? [["BOL", escape(data.bolNumber)]] : []) as [string, string][]),
		...((data.order.shipTo ? [["Ship to", escape(data.order.shipTo)]] : []) as [
			string,
			string,
		][]),
	]

	return {
		subject: `Order #${data.order.orderNumber} has shipped`,
		text: [
			`Order #${data.order.orderNumber} is on its way.`,
			``,
			...(data.carrier ? [`Carrier: ${data.carrier}`] : []),
			...(data.proNumber ? [`PRO:     ${data.proNumber}`] : []),
			...(data.bolNumber ? [`BOL:     ${data.bolNumber}`] : []),
			...(data.order.shipTo ? [`Ship to: ${data.order.shipTo}`] : []),
			``,
			...(data.trackingUrl ? [`Track it: ${data.trackingUrl}`, ``] : []),
			siteUrl(`/portal/orders/${data.order.orderId}`),
			``,
			SIGN_OFF,
		].join("\n"),
		html: wrap(h(`Order #${data.order.orderNumber} is on its way`) + facts(rows), {
			action: {
				label: data.trackingUrl ? "Track the shipment" : "See the order",
				href: link,
			},
		}),
	}
}

// ---------------------------------------------------------------------------
// The public site
// ---------------------------------------------------------------------------

const LEAD_SOURCE: Record<string, string> = {
	CONTACT_FORM: "Contact form",
	COVERAGE_CALCULATOR: "Coverage calculator",
	SAMPLE_REQUEST: "Sample request",
	DEALER_APPLICATION: "Dealer application",
}

/** To the owner. A lead nobody is told about is a lead that goes cold. */
export function newLeadEmail(data: {
	source: string
	name?: string | null
	company?: string | null
	email?: string | null
	phone?: string | null
	message?: string | null
	productName?: string | null
	calculatorSqFt?: string | null
	/** Where a sample should be posted. */
	shipTo?: string | null
}): RenderedEmail {
	const kind = LEAD_SOURCE[data.source] ?? "Enquiry"
	const who = data.company || data.name || "Someone"

	const rows: [string, string][] = [
		["From", escape(who)],
		...((data.name && data.company ? [["Contact", escape(data.name)]] : []) as [
			string,
			string,
		][]),
		...((data.email
			? [["Email", `<a href="mailto:${escape(data.email)}">${escape(data.email)}</a>`]]
			: []) as [string, string][]),
		...((data.phone
			? [["Phone", `<a href="tel:${escape(data.phone)}">${escape(data.phone)}</a>`]]
			: []) as [string, string][]),
		...((data.productName ? [["Product", escape(data.productName)]] : []) as [
			string,
			string,
		][]),
		...((data.calculatorSqFt ? [["Square feet", escape(data.calculatorSqFt)]] : []) as [
			string,
			string,
		][]),
		// Last, and on its own lines: it is the thing being copied onto a
		// package rather than another attribute of the enquiry.
		...((data.shipTo ? [["Post it to", escape(data.shipTo).replace(/\n/g, "<br />")]] : []) as [
			string,
			string,
		][]),
	]

	return {
		subject: `${kind}: ${who}`,
		text: [
			`${kind} from the website.`,
			``,
			`From:  ${who}`,
			...(data.name && data.company ? [`Contact: ${data.name}`] : []),
			...(data.email ? [`Email: ${data.email}`] : []),
			...(data.phone ? [`Phone: ${data.phone}`] : []),
			...(data.productName ? [`Product: ${data.productName}`] : []),
			...(data.calculatorSqFt ? [`Square feet: ${data.calculatorSqFt}`] : []),
			...(data.shipTo ? ["", "Post it to:", data.shipTo] : []),
			...(data.message ? ["", data.message] : []),
			``,
			siteUrl("/admin/leads"),
		].join("\n"),
		html: wrap(h(kind) + facts(rows) + (data.message ? quote(data.message) : ""), {
			action: { label: "Open the lead inbox", href: siteUrl("/admin/leads") },
			// Replying to the notification should reach the person who wrote in,
			// not the mailbox the site sends from.
			footnote: data.email ? `Reply straight to ${escape(data.email)}.` : undefined,
		}),
	}
}
