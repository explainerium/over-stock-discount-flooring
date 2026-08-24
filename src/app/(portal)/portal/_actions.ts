"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { ActionResult } from "@/lib/validation/dealers"
import { chooseShipToSchema } from "@/lib/validation/addresses"
import { reorderSchema } from "@/lib/validation/orders"
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
	reorder,
	setShipTo,
	submitOrder,
	updateLine,
} from "@/server/repositories/orders"
import { UomError } from "@/server/domain/uom"
import { PricingError } from "@/server/domain/pricing"
import { notifyOrderSubmitted } from "@/server/notifications/orders"

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

	// The owner is rarely at a desk, so this is the alert that matters most.
	// SMS alongside it is still the [Rec] in the plan, pending his sign-off.
	await notifyOrderSubmitted(orderId)

	refresh()
	revalidatePath("/portal/orders")
	redirect(`/portal/orders/${orderId}`)
}

/**
 * Ordering the same thing again.
 *
 * The most common thing a flooring dealer does is repeat a job they have done
 * before, and rebuilding a six-line order by hand is the friction that sends
 * them back to the phone.
 *
 * Redirects to the cart rather than staying put, because the point is to keep
 * going — and because the new lines are there, not on the order they came from.
 */
export async function reorderAction(input: unknown): Promise<ActionResult> {
	const { dealerId } = await requireDealerScope()

	const parsed = reorderSchema.safeParse(input)
	if (!parsed.success) return { ok: false, message: "Unknown order." }

	let result: Awaited<ReturnType<typeof reorder>>
	try {
		result = await reorder(dealerId, parsed.data.orderId)
	} catch (error) {
		return { ok: false, message: explain(error) }
	}

	if (result.added === 0) {
		return {
			ok: false,
			message:
				result.skipped.length > 0
					? `Nothing could be added: ${result.skipped.join("; ")}.`
					: "There was nothing on that order to copy.",
		}
	}

	refresh()

	if (result.skipped.length > 0) {
		// Not a failure — most of the order copied. But the missing lines have
		// to be named now, not discovered when the pallet arrives short.
		return {
			ok: true,
			message: `Added ${result.added} of ${result.added + result.skipped.length} lines. Left out: ${result.skipped.join("; ")}.`,
		}
	}

	return { ok: true, message: `${result.added} lines added to your order.` }
}
