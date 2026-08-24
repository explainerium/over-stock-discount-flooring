"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { ActionResult } from "@/lib/validation/dealers"
import { chooseShipToSchema } from "@/lib/validation/addresses"
import {
	addLineSchema,
	lineIdSchema,
	submitOrderSchema,
	updateLineSchema,
} from "@/lib/validation/orders"
import { requireDealerScope } from "@/server/auth/guards"
import {
	OrderError,
	addLine,
	getOrCreateDraft,
	removeLine,
	setShipTo,
	submitOrder,
	updateLine,
} from "@/server/repositories/orders"
import { UomError } from "@/server/domain/uom"
import { PricingError } from "@/server/domain/pricing"

/**
 * Cart actions.
 *
 * Every one starts with `requireDealerScope`, which returns a non-null dealer
 * id — the line is then built against that id rather than one supplied by the
 * caller. A product id in a request body is a request; a dealer id in one would
 * be an invitation.
 */

/** Turns a domain error into something a dealer can act on. */
function explain(error: unknown): string {
	if (error instanceof UomError || error instanceof PricingError || error instanceof OrderError) {
		return error.message
	}
	console.error("[cart]", error)
	return "Something went wrong adding that. Try again."
}

function refresh() {
	revalidatePath("/portal/cart")
	revalidatePath("/portal/catalog")
	revalidatePath("/portal", "layout")
}

export async function addLineAction(input: unknown): Promise<ActionResult> {
	const { dealerId } = await requireDealerScope()

	const parsed = addLineSchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}

	try {
		await addLine({ dealerId, ...parsed.data })
	} catch (error) {
		return { ok: false, message: explain(error) }
	}

	refresh()
	return { ok: true, message: "Added to your order." }
}

export async function updateLineAction(input: unknown): Promise<ActionResult> {
	const { dealerId } = await requireDealerScope()

	const parsed = updateLineSchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}

	try {
		// wasteFactorPct is passed through as-is, undefined included: the
		// repository reads it back off the line when the form does not send one.
		await updateLine({ dealerId, ...parsed.data })
	} catch (error) {
		return { ok: false, message: explain(error) }
	}

	refresh()
	return { ok: true, message: "Updated." }
}

export async function removeLineAction(input: unknown): Promise<ActionResult> {
	const { dealerId } = await requireDealerScope()

	const parsed = lineIdSchema.safeParse(input)
	if (!parsed.success) return { ok: false, message: "Unknown line." }

	try {
		await removeLine(dealerId, parsed.data.itemId)
	} catch (error) {
		return { ok: false, message: explain(error) }
	}

	refresh()
	return { ok: true, message: "Removed." }
}

/**
 * Choosing where the order goes.
 *
 * Saved the moment it is picked rather than at submission. The freight figure
 * and the accessorials both follow from this choice, so it should be settled
 * while the dealer is still looking at the options.
 */
export async function setShipToAction(input: unknown): Promise<ActionResult> {
	const { dealerId } = await requireDealerScope()

	const parsed = chooseShipToSchema.safeParse(input)
	if (!parsed.success) return { ok: false, message: "Unknown address." }

	try {
		const orderId = await getOrCreateDraft(dealerId)
		await setShipTo(dealerId, orderId, parsed.data.addressId)
	} catch (error) {
		return { ok: false, message: explain(error) }
	}

	refresh()
	return { ok: true, message: "Delivery address set." }
}

/**
 * Sends the order to the owner.
 *
 * Redirects to the order rather than back to the cart, because the cart is now
 * empty and landing on an empty cart after submitting reads as though the order
 * vanished.
 */
export async function submitOrderAction(input: unknown): Promise<ActionResult> {
	const { dealerId, user } = await requireDealerScope()

	const parsed = submitOrderSchema.safeParse(input)
	if (!parsed.success) {
		return { ok: false, message: "Add a shorter note and try again." }
	}

	let orderId: string
	try {
		orderId = await submitOrder({
			dealerId,
			actorId: user.id,
			notes: parsed.data.notes ?? null,
			orderId: parsed.data.orderId,
		})
	} catch (error) {
		return { ok: false, message: explain(error) }
	}

	// TODO: alert the owner. Email needs a mailbox on the business domain, and
	// he has said he is rarely at a desk — SMS is the [Rec] in the plan for
	// exactly this moment. Until then the admin queue is the only signal.
	refresh()
	revalidatePath("/portal/orders")
	redirect(`/portal/orders/${orderId}`)
}
