"use server"

import { revalidatePath } from "next/cache"
import type { ActionResult } from "@/lib/validation/dealers"
import {
	orderChargesSchema,
	shipOrderSchema,
	staffLineIdSchema,
	staffLineSchema,
	transitionOrderSchema,
} from "@/lib/validation/orders"
import { requireStaff } from "@/server/auth/guards"
import { TERMINAL, TRANSITIONS, canTransition, label } from "@/server/domain/orders"
import { PricingError } from "@/server/domain/pricing"
import { UomError } from "@/server/domain/uom"
import { notifyOrderDecision } from "@/server/notifications/orders"
import { audit } from "@/server/repositories/audit"
import { raiseInvoice } from "@/server/repositories/quickbooks"
import {
	OrderError,
	getOrderForStaff,
	setOrderCharges,
	staffRemoveLine,
	staffUpdateLine,
	transitionOrder,
} from "@/server/repositories/orders"

/**
 * Everything the owner does to an order.
 *
 * Each of these writes an audit entry with the before and the after. That is
 * not bookkeeping for its own sake: the dealer sees a price that is no longer
 * the one they submitted, and when they ring up about it the answer has to be
 * on the screen rather than in somebody's memory.
 */

function explain(error: unknown): string {
	if (error instanceof OrderError || error instanceof UomError || error instanceof PricingError) {
		return error.message
	}
	console.error("[admin/orders]", error)
	return "Something went wrong. Try again."
}

/** Everything that shows this order, in the two places it is shown. */
function refresh(orderId: string) {
	revalidatePath(`/admin/orders/${orderId}`)
	revalidatePath("/admin/orders")
	revalidatePath("/admin", "layout")
	revalidatePath(`/portal/orders/${orderId}`)
	revalidatePath("/portal/orders")
}

/**
 * Moving an order.
 *
 * The lifecycle table decides what is legal and whether a reason is required.
 * This action asks it rather than restating the rules, so there is one place to
 * check them against what the client actually described.
 */
export async function transitionOrderAction(input: unknown): Promise<ActionResult> {
	const staff = await requireStaff()

	const parsed = transitionOrderSchema.safeParse(input)
	if (!parsed.success) return { ok: false, message: "That is not a move we recognize." }

	const order = await getOrderForStaff(parsed.data.orderId)
	if (!order) return { ok: false, message: "That order does not exist." }

	const allowed = canTransition(order.status, parsed.data.to, "STAFF")
	if (!allowed.ok) return { ok: false, message: allowed.reason! }

	/**
	 * An order can be emptied from this screen — the owner can take off a line
	 * he cannot supply — and the Approve button sits right above the lines. An
	 * approved order with nothing on it is freight charged for no goods, so the
	 * only ways out of an empty order are the ones that end it.
	 */
	if (order.items.length === 0 && !TERMINAL.includes(parsed.data.to)) {
		return {
			ok: false,
			message: "There is nothing left on this order. Reject or cancel it instead.",
		}
	}

	const rule = TRANSITIONS.find((t) => t.from === order.status && t.to === parsed.data.to)
	const note = parsed.data.note?.trim()

	if (rule?.note === "required" && !note) {
		return {
			ok: false,
			message: "Say why. The dealer reads this, and a bare status is a phone call later.",
			field: "note",
		}
	}

	try {
		await transitionOrder({
			orderId: order.id,
			to: parsed.data.to,
			actorId: staff.id,
			note: note || null,
			data: parsed.data.to === "APPROVED" ? { approvedAt: new Date() } : undefined,
		})
	} catch (error) {
		return { ok: false, message: explain(error) }
	}

	await audit({
		entity: "Order",
		entityId: order.id,
		action: `status:${parsed.data.to.toLowerCase()}`,
		actorId: staff.id,
		before: { status: order.status },
		after: { status: parsed.data.to, note: note || null },
	})

	// Told rather than left to notice. A dealer who has to think to check the
	// portal is a dealer who rings up instead.
	await notifyOrderDecision(order.id, parsed.data.to, note || null)

	// Approving is what raises the invoice — the client's own sequence: "we
	// approve and then send invoice through Quickbooks". It cannot fail the
	// approval, which has already happened and which the dealer has already been
	// told about, so the outcome rides back on the message instead.
	let invoiced: string | null = null
	if (parsed.data.to === "APPROVED") {
		const result = await raiseInvoice(order.id)
		invoiced = result.ok
			? result.alreadySent
				? null
				: " Invoice raised in QuickBooks."
			: ` Not invoiced: ${result.reason}`
	}

	refresh(order.id)

	return {
		ok: true,
		message:
			`Order #${order.orderNumber} is now ${label(parsed.data.to).toLowerCase()}.` +
			(invoiced ?? ""),
	}
}

/** Changing a quantity or a price before approving. */
export async function updateOrderLineAction(input: unknown): Promise<ActionResult> {
	const staff = await requireStaff()

	const parsed = staffLineSchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}

	try {
		const { before, after } = await staffUpdateLine(parsed.data)

		await audit({
			entity: "Order",
			entityId: parsed.data.orderId,
			action: "line:update",
			actorId: staff.id,
			before,
			after,
		})
	} catch (error) {
		return { ok: false, message: explain(error) }
	}

	refresh(parsed.data.orderId)
	return { ok: true, message: "Line updated." }
}

export async function removeOrderLineAction(input: unknown): Promise<ActionResult> {
	const staff = await requireStaff()

	const parsed = staffLineIdSchema.safeParse(input)
	if (!parsed.success) return { ok: false, message: "Unknown line." }

	try {
		const before = await staffRemoveLine(parsed.data.orderId, parsed.data.itemId)

		await audit({
			entity: "Order",
			entityId: parsed.data.orderId,
			action: "line:remove",
			actorId: staff.id,
			before,
		})
	} catch (error) {
		return { ok: false, message: explain(error) }
	}

	refresh(parsed.data.orderId)
	return { ok: true, message: "Line removed." }
}

/**
 * Marking an order shipped.
 *
 * Separate from the general transition because it carries the shipment with it.
 * The plan singles this notification out as the one that removes "where's my
 * order?" calls, and it only does that if it has something to say — so the
 * details are collected in the same step that sends it, not left to be filled
 * in afterwards by somebody who has moved on.
 */
export async function shipOrderAction(input: unknown): Promise<ActionResult> {
	const staff = await requireStaff()

	const parsed = shipOrderSchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}

	const order = await getOrderForStaff(parsed.data.orderId)
	if (!order) return { ok: false, message: "That order does not exist." }

	const allowed = canTransition(order.status, "SHIPPED", "STAFF")
	if (!allowed.ok) return { ok: false, message: allowed.reason! }

	const shipment = {
		carrier: parsed.data.carrier,
		proNumber: parsed.data.proNumber || null,
		bolNumber: parsed.data.bolNumber || null,
		trackingUrl: parsed.data.trackingUrl || null,
	}

	try {
		await transitionOrder({
			orderId: order.id,
			to: "SHIPPED",
			actorId: staff.id,
			// The carrier and PRO go in the history note as well as the columns,
			// so the timeline reads as a record of what happened rather than a
			// bare status somebody has to cross-reference.
			note: [shipment.carrier, shipment.proNumber].filter(Boolean).join(" · "),
			data: { ...shipment, shippedAt: new Date() },
		})
	} catch (error) {
		return { ok: false, message: explain(error) }
	}

	await audit({
		entity: "Order",
		entityId: order.id,
		action: "status:shipped",
		actorId: staff.id,
		before: { status: order.status },
		after: shipment,
	})

	await notifyOrderDecision(order.id, "SHIPPED", null)

	refresh(order.id)
	return { ok: true, message: `Order #${order.orderNumber} is on its way.` }
}

/** Freight, tax, and the note the dealer never sees. */
export async function setOrderChargesAction(input: unknown): Promise<ActionResult> {
	const staff = await requireStaff()

	const parsed = orderChargesSchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}

	try {
		const { before, after } = await setOrderCharges(parsed.data.orderId, {
			freight: parsed.data.freight,
			tax: parsed.data.tax,
			internalNotes: parsed.data.internalNotes || null,
		})

		await audit({
			entity: "Order",
			entityId: parsed.data.orderId,
			action: "charges:update",
			actorId: staff.id,
			before,
			after,
		})
	} catch (error) {
		return { ok: false, message: explain(error) }
	}

	refresh(parsed.data.orderId)
	return { ok: true, message: "Saved." }
}
