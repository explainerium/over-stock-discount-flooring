"use server"

import { revalidatePath } from "next/cache"
import type { ActionResult } from "@/lib/validation/dealers"
import { addLineSchema, lineIdSchema, updateLineSchema } from "@/lib/validation/orders"
import { requireDealerScope } from "@/server/auth/guards"
import { OrderError, addLine, removeLine, updateLine } from "@/server/repositories/orders"
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
		await updateLine(
			dealerId,
			parsed.data.itemId,
			parsed.data.unit,
			parsed.data.quantity,
			parsed.data.wasteFactorPct ?? 0,
		)
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
