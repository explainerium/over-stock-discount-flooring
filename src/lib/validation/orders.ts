import { z } from "zod"

/**
 * Order lines.
 *
 * Quantities stay strings the whole way — form, action, engine, Postgres. The
 * UOM engine takes `Decimal.Value`, and putting a square footage through
 * `Number()` on the way in would undo the exactness everything downstream
 * depends on.
 */

const ORDER_UOMS = [
	"SQFT",
	"BOX",
	"PALLET",
	"LF",
	"STICK",
	"BUNDLE",
	"EACH",
	"ROLL",
] as const

const quantity = z
	.string()
	.trim()
	.min(1, "How much do you need?")
	.regex(/^\d+(\.\d{1,2})?$/, "Enter a number.")
	.refine((v) => Number(v) > 0, "That has to be more than zero.")

/** 0, 5 or 10 — the figures installers actually use. */
const waste = z.coerce.number().int().min(0).max(100).optional()

export const addLineSchema = z.object({
	productId: z.string().min(1),
	unit: z.enum(ORDER_UOMS),
	quantity,
	wasteFactorPct: waste,
})

export const updateLineSchema = z.object({
	itemId: z.string().min(1),
	unit: z.enum(ORDER_UOMS),
	quantity,
	wasteFactorPct: waste,
})

export const lineIdSchema = z.object({ itemId: z.string().min(1) })

/** What the add-to-cart form renders — the product id comes from the page. */
export const addLineFormSchema = addLineSchema.omit({ productId: true })

export type AddLineInput = z.infer<typeof addLineSchema>
export type AddLineFormInput = z.infer<typeof addLineFormSchema>
export type UpdateLineInput = z.infer<typeof updateLineSchema>
