import "server-only"
import { formatMoney } from "@/lib/format/money"
import { formatAddress, type AddressParts } from "@/server/domain/addresses"
import type { OrderStatus } from "@/server/domain/orders"
import {
	changesRequestedEmail,
	newLeadEmail,
	orderApprovedEmail,
	orderRejectedEmail,
	orderShippedEmail,
	orderSubmittedEmail,
	sendEmail,
	type OrderSummary,
} from "@/server/integrations/email"
import { db } from "@/server/db/client"
import { dealerRecipients, orderSubmitter, staffRecipients } from "@/server/repositories/recipients"

/**
 * Telling people what happened.
 *
 * Between the actions and the mail layer, so an action stays a short list of
 * verbs — validate, write, audit, notify, revalidate — and so the decision
 * about *who hears about what* is readable in one file rather than inferred
 * from five.
 *
 * Nothing here throws. The action it follows has already committed; failing a
 * transition because a mail API was slow would be a worse outcome than a
 * missing message, and the order page is the record either way. Failures are
 * reported to the console so the gap is visible.
 */

async function loadOrder(orderId: string) {
	return db.order.findUnique({
		where: { id: orderId },
		select: {
			id: true,
			orderNumber: true,
			total: true,
			freight: true,
			dealerId: true,
			dealerNotes: true,
			carrier: true,
			bolNumber: true,
			proNumber: true,
			trackingUrl: true,
			shipToSnapshot: true,
			dealer: { select: { companyName: true } },
			_count: { select: { items: true } },
		},
	})
}

type OrderRow = NonNullable<Awaited<ReturnType<typeof loadOrder>>>

function summarise(order: OrderRow): OrderSummary {
	const snapshot = order.shipToSnapshot as AddressParts | null

	return {
		orderId: order.id,
		orderNumber: order.orderNumber,
		companyName: order.dealer.companyName,
		lineCount: order._count.items,
		total: formatMoney(order.total.toString()),
		shipTo: snapshot ? formatAddress(snapshot) : null,
	}
}

function report(what: string, error: unknown) {
	console.error(`[notify] ${what}`, error)
}

/** To the owner, the moment a dealer sends something. */
export async function notifyOrderSubmitted(orderId: string): Promise<void> {
	try {
		const [order, staff] = await Promise.all([loadOrder(orderId), staffRecipients()])
		if (!order || !staff.to) return

		const submittedBy = (await orderSubmitter(orderId)) ?? order.dealer.companyName

		await sendEmail(
			orderSubmittedEmail({
				order: summarise(order),
				submittedBy,
				dealerNotes: order.dealerNotes,
				// Zero means nothing rated it, not that delivery is free.
				freight: Number(order.freight) > 0 ? formatMoney(order.freight.toString()) : null,
			}),
			{ to: staff.to, cc: staff.cc },
		)
	} catch (error) {
		report(`could not tell staff about order ${orderId}`, error)
	}
}

/**
 * To the dealer, when the owner has decided.
 *
 * Only the states a dealer is waiting on produce a message. Marking an order
 * invoiced or delivered is bookkeeping the owner does after the fact, and
 * mailing on every internal step is how people learn to filter the sender.
 */
export async function notifyOrderDecision(
	orderId: string,
	to: OrderStatus,
	note: string | null,
): Promise<void> {
	try {
		const order = await loadOrder(orderId)
		if (!order) return

		const summary = summarise(order)
		const recipients = await dealerRecipients(order.dealerId)
		if (!recipients.to) return

		const rendered =
			to === "APPROVED"
				? orderApprovedEmail({
						order: summary,
						freight:
							Number(order.freight) > 0
								? formatMoney(order.freight.toString())
								: "Included — nothing extra to pay",
						note,
					})
				: to === "CHANGES_REQUESTED"
					? changesRequestedEmail({ order: summary, reason: note ?? "" })
					: to === "REJECTED"
						? orderRejectedEmail({ order: summary, reason: note ?? "" })
						: to === "SHIPPED"
							? orderShippedEmail({
									order: summary,
									carrier: order.carrier,
									bolNumber: order.bolNumber,
									proNumber: order.proNumber,
									trackingUrl: order.trackingUrl,
								})
							: null

		if (!rendered) return

		await sendEmail(rendered, { to: recipients.to, cc: recipients.cc })
	} catch (error) {
		report(`could not tell the dealer about order ${orderId}`, error)
	}
}

/**
 * How many lead notifications may go out in a window, and how long that window
 * is. Generous for a flooring supplier in High Point — a real day of enquiries
 * will not come close — and low enough that a bot past the honeypot cannot
 * empty a mail quota or bury the ones that matter.
 */
const LEAD_MAIL_LIMIT = 12
const LEAD_MAIL_WINDOW_MS = 10 * 60 * 1000

/**
 * To the owner, when somebody writes in from the public site.
 *
 * Capped, because this is the only mail an anonymous stranger can cause. The
 * lead itself is always stored — the cap protects the mailbox, and dropping
 * data would be a worse trade than a quiet inbox. Over the limit, the lead
 * inbox in admin is still complete and the skip is logged.
 *
 * The count runs against the leads table rather than an in-process counter,
 * which matters on Vercel: a per-instance counter resets with every cold start
 * and is not shared between the lambdas answering the form.
 */
export async function notifyNewLead(lead: {
	source: string
	name?: string | null
	company?: string | null
	email?: string | null
	phone?: string | null
	message?: string | null
	productName?: string | null
	calculatorSqFt?: string | null
	shipTo?: string | null
}): Promise<void> {
	try {
		const staff = await staffRecipients()
		if (!staff.to) return

		const recent = await db.lead.count({
			where: { createdAt: { gte: new Date(Date.now() - LEAD_MAIL_WINDOW_MS) } },
		})
		if (recent > LEAD_MAIL_LIMIT) {
			console.warn(
				`[notify] ${recent} leads in the last ${LEAD_MAIL_WINDOW_MS / 60000} minutes — ` +
					`not mailing this one. Check the lead inbox.`,
			)
			return
		}

		await sendEmail(newLeadEmail(lead), {
			to: staff.to,
			cc: staff.cc,
			// So hitting reply reaches the person who wrote in, not the mailbox
			// the site sends from.
			replyTo: lead.email ?? undefined,
		})
	} catch (error) {
		report("could not tell staff about a new lead", error)
	}
}
