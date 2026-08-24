import { z } from "zod"

/**
 * Order lines.
 *
 * Quantities stay strings the whole way — form, action, engine, Postgres. The
 * UOM engine takes `Decimal.Value`, and putting a square footage through
 * `Number()` on the way in would undo the exactness everything downstream
 * depends on.
 */

const ORDER_UOMS = ["SQFT", "BOX", "PALLET", "LF", "STICK", "BUNDLE", "EACH", "ROLL"] as const

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

export const submitOrderSchema = z.object({
	notes: z.string().trim().max(2000).optional(),
	/** Omitted for the cart. Supplied when sending back an order after changes. */
	orderId: z.string().min(1).optional(),
})

/**
 * What staff send when they move an order.
 *
 * The note is required or optional depending on the transition — rejecting
 * without a reason is a phone call later — but that rule lives in the lifecycle
 * table, not here, so there is one place to read it.
 */
export const transitionOrderSchema = z.object({
	orderId: z.string().min(1),
	to: z.enum([
		"SUBMITTED",
		"CHANGES_REQUESTED",
		"APPROVED",
		"INVOICED",
		"SHIPPED",
		"DELIVERED",
		"CLOSED",
		"REJECTED",
		"CANCELLED",
	]),
	note: z.string().trim().max(2000).optional(),
})

export type SubmitOrderInput = z.infer<typeof submitOrderSchema>
export type TransitionOrderInput = z.infer<typeof transitionOrderSchema>

/**
 * What the owner may change on a submitted order.
 *
 * Money arrives as a string for the same reason quantities do — the pricing
 * engine takes `Decimal.Value`, and a unit price that has been through
 * `Number()` is no longer the figure that was typed.
 */
/**
 * Precision is matched to the column, not to a general idea of money.
 *
 * A unit price is numeric(12,4), because per-square-foot pricing runs to four
 * places in this trade. Freight and tax are numeric(12,2). Accepting four
 * places on a two-place column does not fail — Postgres rounds it and stores
 * a figure the owner did not type, which is worse than being told.
 */
const unitPriceInput = z
	.string()
	.trim()
	.regex(/^\d+(\.\d{1,4})?$/, "Enter a price, like 1.86 or 1.8615")

const chargeInput = z
	.string()
	.trim()
	.regex(/^\d+(\.\d{1,2})?$/, "Enter an amount, like 450 or 486.50")

export const staffLineSchema = z.object({
	orderId: z.string().min(1),
	itemId: z.string().min(1),
	quantity,
	unitPrice: unitPriceInput,
})

/** The id fields come from the page, so the form itself never registers them. */
export const staffLineFormSchema = staffLineSchema.omit({
	orderId: true,
	itemId: true,
})

export const staffLineIdSchema = z.object({
	orderId: z.string().min(1),
	itemId: z.string().min(1),
})

export const orderChargesSchema = z.object({
	orderId: z.string().min(1),
	freight: chargeInput,
	tax: chargeInput,
	internalNotes: z.string().trim().max(2000).optional(),
})

export const orderChargesFormSchema = orderChargesSchema.omit({
	orderId: true,
})

export type StaffLineInput = z.infer<typeof staffLineSchema>
export type StaffLineFormInput = z.infer<typeof staffLineFormSchema>
export type OrderChargesInput = z.infer<typeof orderChargesSchema>
export type OrderChargesFormInput = z.infer<typeof orderChargesFormSchema>

/**
 * What goes on an order when it ships.
 *
 * The carrier is the one required field. Everything else a carrier gives you is
 * optional — the owner sometimes runs a local delivery in his own truck, and
 * there is no PRO number for that — but "your order shipped" with nothing
 * attached is the message that causes the call it was meant to prevent.
 */
export const shipOrderSchema = z.object({
	orderId: z.string().min(1),
	carrier: z.string().trim().min(1, "Who is bringing it? Your own truck counts.").max(80),
	proNumber: z.string().trim().max(60).optional(),
	bolNumber: z.string().trim().max(60).optional(),
	trackingUrl: z
		.string()
		.trim()
		.url("That does not look like a link — paste the whole URL.")
		.max(500)
		.optional()
		.or(z.literal("")),
})

/** The id comes from the page, so the form never registers it. */
export const shipOrderFormSchema = shipOrderSchema.omit({ orderId: true })

export type ShipOrderInput = z.infer<typeof shipOrderSchema>
export type ShipOrderFormInput = z.infer<typeof shipOrderFormSchema>

export const reorderSchema = z.object({ orderId: z.string().min(1) })
