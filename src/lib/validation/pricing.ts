import { z } from "zod"

/**
 * Pricing schemas.
 *
 * Money stays a string from the form to Postgres, where the column is
 * `numeric`. Anything that puts it through `Number()` on the way has undone
 * the point of storing it as a decimal.
 */

const decimalText = (label: string) =>
	z
		.union([
			z.literal(""),
			z
				.string()
				.trim()
				.regex(/^\d+(\.\d{1,4})?$/, `${label} must be a number.`),
		])
		.optional()

const percentText = z
	.union([
		z.literal(""),
		z
			.string()
			.trim()
			.regex(/^\d+(\.\d{1,2})?$/, "A discount must be a number.")
			.refine((v) => Number(v) <= 100, "A discount cannot be more than 100%."),
	])
	.optional()

export function blank(value: string | undefined): string | undefined {
	const trimmed = value?.trim()
	return trimmed ? trimmed : undefined
}

export const setDealerDiscountSchema = z.object({
	dealerId: z.string().min(1),
	discountPct: percentText,
})

/**
 * One product's exception for one dealer.
 *
 * Both fields optional, and both empty means "remove the override" rather than
 * "set it to nothing" — a dealer with no exception should fall through to their
 * flat rate, not to a row full of nulls.
 */
export const setDealerPriceSchema = z
	.object({
		dealerId: z.string().min(1),
		productId: z.string().min(1),
		price: decimalText("Price"),
		discountPct: percentText,
	})
	.refine((values) => !(blank(values.price) && blank(values.discountPct)), {
		message: "Set a price or a discount, not both.",
		path: ["price"],
	})

/** A dealer's price on a whole series. Empty clears it. */
export const setDealerSeriesPriceSchema = z.object({
	dealerId: z.string().min(1),
	seriesId: z.string().min(1),
	price: decimalText("Price"),
})

export type SetDealerDiscountInput = z.infer<typeof setDealerDiscountSchema>
export type SetDealerPriceInput = z.infer<typeof setDealerPriceSchema>

/**
 * Form-level schemas: what the user types, and nothing else.
 *
 * The ids live only on the action schemas above. A resolver runs BEFORE the
 * submit handler, so an id that react-hook-form never registered fails
 * validation first and the handler is never reached — which looks, from the
 * outside, like a button that does nothing. Splitting the two means the form
 * validates the fields it renders and the action validates everything it needs.
 */
export const dealerDiscountFormSchema = setDealerDiscountSchema.omit({ dealerId: true })
export const dealerPriceFormSchema = z.object({
	price: decimalText("Price"),
	discountPct: percentText,
})

export type DealerDiscountFormInput = z.infer<typeof dealerDiscountFormSchema>
