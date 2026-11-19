"use server"

import { revalidatePath } from "next/cache"
import type { ActionResult } from "@/lib/validation/dealers"
import {
	blank,
	setDealerDiscountSchema,
	setDealerPriceSchema,
	setDealerSeriesPriceSchema,
} from "@/lib/validation/pricing"
import { requireStaff } from "@/server/auth/guards"
import { audit } from "@/server/repositories/audit"
import {
	listPriceOf,
	setDealerDiscount,
	setDealerSeriesPrice,
	upsertDealerPrice,
} from "@/server/repositories/pricing"

export async function setDealerDiscountAction(input: unknown): Promise<ActionResult> {
	const staff = await requireStaff()

	const parsed = setDealerDiscountSchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}

	const discount = blank(parsed.data.discountPct) ?? null
	const dealer = await setDealerDiscount(parsed.data.dealerId, discount)

	// Logged every time. A dealer's rate is the number they will eventually
	// argue about, and "who changed it, and when" should not be a guess.
	await audit({
		entity: "Dealer",
		entityId: dealer.id,
		action: "discount-set",
		actorId: staff.id,
		after: { discountPct: discount },
	})

	revalidatePath(`/admin/dealers/${dealer.id}/pricing`)
	return {
		ok: true,
		message: discount
			? `${dealer.companyName} now gets ${discount}% off list.`
			: `${dealer.companyName} is back to list pricing.`,
	}
}

export async function setDealerPriceAction(input: unknown): Promise<ActionResult> {
	const staff = await requireStaff()

	const parsed = setDealerPriceSchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}
	const { dealerId, productId } = parsed.data

	const price = blank(parsed.data.price) ?? null
	const discountPct = blank(parsed.data.discountPct) ?? null

	// Saved, it would sit there doing nothing: the engine has no list to take it off.
	if (discountPct && !price && (await listPriceOf(productId)) === null) {
		return {
			ok: false,
			message:
				"This product has no list price to take a percentage off. Type a price instead.",
			field: "discountPct",
		}
	}

	await upsertDealerPrice({ dealerId, productId, price, discountPct })

	await audit({
		entity: "DealerPrice",
		entityId: `${dealerId}:${productId}`,
		action: price || discountPct ? "set" : "cleared",
		actorId: staff.id,
		after: { price, discountPct },
	})

	revalidatePath(`/admin/dealers/${dealerId}/pricing`)
	return {
		ok: true,
		message: price || discountPct ? "Saved." : "Exception removed — back to their flat rate.",
	}
}

/**
 * One dealer's price on a whole series: how the client prices flooring.
 * Every color in the series takes it, including colors added later, unless a
 * product has its own price for this dealer.
 */
export async function setDealerSeriesPriceAction(input: unknown): Promise<ActionResult> {
	const staff = await requireStaff()

	const parsed = setDealerSeriesPriceSchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}
	const { dealerId, seriesId } = parsed.data
	const price = blank(parsed.data.price) ?? null

	await setDealerSeriesPrice(dealerId, seriesId, price)

	await audit({
		entity: "DealerSeriesPrice",
		entityId: `${dealerId}:${seriesId}`,
		action: price ? "set" : "cleared",
		actorId: staff.id,
		after: { price },
	})

	revalidatePath(`/admin/dealers/${dealerId}/pricing`)
	return {
		ok: true,
		message: price ? "Saved for every color in the series." : "Series price removed.",
	}
}
