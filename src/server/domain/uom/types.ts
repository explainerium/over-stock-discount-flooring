import type Decimal from "decimal.js"

/**
 * Units a dealer may enter a quantity in.
 *
 * Kept as a plain union rather than importing Prisma's enum: nothing under
 * `domain/` may depend on the database layer, or the engine stops being
 * testable without one.
 */
export type Uom = "SQFT" | "BOX" | "PALLET" | "LF" | "STICK" | "BUNDLE" | "EACH" | "ROLL"

/**
 * What kind of thing is being sold, which decides how a quantity converts.
 *
 * Derived from the spec rather than stored, because it is a consequence of the
 * other fields — a product with sq ft per box is flooring, whatever anyone
 * labelled it.
 */
export type ProductFamily = "FLOORING" | "LINEAR" | "ROLL" | "UNIT"

/**
 * Everything the engine needs about one product, and nothing else.
 *
 * Assembled by a repository from the series spec, any per-product override and
 * the product's own conversion rows. Deliberately not a Prisma model: the
 * engine is called from the cart, the order, the admin edit screen, the invoice
 * builder and the public calculator, and only one of those has a database
 * record to hand.
 */
export interface ProductSpec {
	/** The unit the price is quoted in. Flooring is SQFT, trim is LF. */
	pricingUom: Uom
	/** Units the dealer is allowed to pick from. */
	orderUoms: readonly Uom[]

	/** Flooring. Both required for a flooring product. */
	sqFtPerBox?: Decimal.Value
	boxesPerPallet?: number
	lbPerBox?: Decimal.Value

	/** Linear goods — baseboard, quarter round. Both optional: see resolve(). */
	lfPerStick?: Decimal.Value
	sticksPerBundle?: number

	/** Roll goods — underlayment, moisture barrier. */
	sqFtPerRoll?: Decimal.Value
}

/**
 * The result of converting what a dealer typed into what actually ships.
 *
 * Every figure is exact. Display rounding belongs to the formatting layer, not
 * here — this returns 1205.64 and something else decides it reads "1205".
 */
export interface Conversion {
	/** Verbatim, so the order can be shown back the way it was entered. */
	enteredQty: Decimal
	enteredUom: Uom
	wasteFactorPct: number

	/** The discrete unit the product actually ships in. */
	sellableUom: Uom
	/** Whole units, rounded up. Fractional only where the unit is continuous. */
	sellableQty: Decimal

	/** What the line is billed on, in `pricingUom`. */
	billableQty: Decimal
	billableUom: Uom

	/** Flooring only. */
	boxes?: number
	pallets?: Decimal
	coverageSqFt?: Decimal
	weightLb?: Decimal
}

export class UomError extends Error {
	constructor(
		message: string,
		readonly code:
			| "UOM_NOT_ALLOWED"
			| "SPEC_INCOMPLETE"
			| "QUANTITY_INVALID"
			| "CONVERSION_UNSUPPORTED",
	) {
		super(message)
		this.name = "UomError"
	}
}
