"use server"

import { revalidatePath } from "next/cache"
import type { ActionResult } from "@/lib/validation/dealers"
import {
	orderChargesSchema,
	staffLineIdSchema,
	staffLineSchema,
	transitionOrderSchema,
} from "@/lib/validation/orders"
import { requireStaff } from "@/server/auth/guards"
import { TERMINAL, TRANSITIONS, canTransition, label } from "@/server/domain/orders"
import { PricingError } from "@/server/domain/pricing"
import { UomError } from "@/server/domain/uom"
import { audit } from "@/server/repositories/audit"
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
	if (!parsed.success) return { ok: false, message: "That is not a move we recognise." }

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

	// TODO: tell the dealer. Email needs a mailbox on the business domain, which
	// is still outstanding — until it exists the dealer finds out by looking,
	// which means they have to think to look.
	refresh(order.id)

	return {
		ok: true,
		message: `Order #${order.orderNumber} is now ${label(parsed.data.to).toLowerCase()}.`,
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
