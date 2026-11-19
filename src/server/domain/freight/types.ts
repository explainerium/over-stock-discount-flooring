import type Decimal from "decimal.js"

/**
 * Freight, as Phase 1 rates it.
 *
 * Plain values throughout, no Prisma types — the same rule the pricing and UOM
 * engines follow. This is called from the cart, from order submission, from the
 * owner's approval screen and from the tests, and only some of those have a
 * database row to hand.
 *
 * Phase 1 is a zone table the owner maintains himself. TQL live rates drop in
 * behind the same result type later, if they grant API access; nothing outside
 * this folder should be able to tell the difference beyond the `source` field.
 */

/**
 * The extras a carrier bills on top of the linehaul.
 *
 * These three codes match the three booleans on an address, because that is
 * where the model puts them: a jobsite and a dealer's own warehouse are
 * different prices for the same pallet, and the difference is a property of the
 * place rather than something to re-ask on every order.
 */
export type AccessorialCode = "RESIDENTIAL" | "LIFTGATE" | "LIMITED_ACCESS"

/** One row of the owner's zone table. */
export interface ZoneRates {
	id: string
	name: string
	/** Two-letter states the zone covers. */
	states: readonly string[]
	/** ZIPs it covers — five full digits, or a leading prefix like "27". */
	zips: readonly string[]

	perPalletRate?: Decimal.Value | null
	perBoxRate?: Decimal.Value | null
	/**
	 * The carrier's floor for the lane. It lifts the linehaul and nothing else —
	 * accessorials are charged on top of a minimum, not absorbed by it.
	 */
	minCharge?: Decimal.Value | null

	ftlThresholdPallets?: number | null
	ftlRate?: Decimal.Value | null
}

/** A published accessorial charge, as the owner maintains it. */
export interface AccessorialCharge {
	code: string
	label: string
	rate: Decimal.Value
}

/** One that ended up on a quote. */
export interface AppliedAccessorial {
	code: string
	label: string
	rate: Decimal
}

/** What is going on the truck, and where to. */
export interface Shipment {
	state: string
	zip: string
	/**
	 * Whole pallets across the whole order, already rounded up once — the order
	 * repository sums the fractions per product before rounding, because five
	 * colors of ten boxes travel as one pallet and not as five.
	 */
	pallets: number
	/** Boxes across the order. Zero for anything that does not ship in boxes. */
	boxes: number
	accessorials: readonly AccessorialCode[]
}

/**
 * How the linehaul was arrived at.
 *
 * Recorded rather than inferred. The owner will be asked why a number is what
 * it is, and "eight pallets at the Zone 2 rate" is a different answer from
 * "the Zone 2 minimum", which is a different answer again from "that is what
 * you agreed with them".
 */
export type FreightBasis = "PER_PALLET" | "PER_BOX" | "FTL" | "FLAT"

export interface FreightQuote {
	quoted: true
	/** Linehaul plus accessorials, to the cent. */
	amount: Decimal
	linehaul: Decimal
	accessorialTotal: Decimal
	accessorials: AppliedAccessorial[]
	basis: FreightBasis
	source: "ZONE" | "FLAT"
	zoneId?: string
	zoneName?: string
	/** True when the zone's minimum lifted the linehaul above what the rates came to. */
	minChargeApplied: boolean
}

/**
 * Why there is no number.
 *
 * A returned result rather than a thrown error, which is the one place this
 * engine parts company with the pricing one. A product with no list price is a
 * mistake somebody has to go and fix; an order nobody can rate automatically is
 * a designed outcome — the owner types the figure at approval and the order
 * carries `MANUAL` as its source. Throwing would turn the ordinary case into an
 * exception the cart has to catch on every render.
 */
export interface FreightUnrated {
	quoted: false
	/** Written to be shown as-is: to the owner in admin, to the dealer in the cart. */
	reason: string
	code: "NO_DESTINATION" | "NO_ZONE" | "NO_RATE" | "OVER_FTL" | "MANUAL_MODE" | "LIVE_UNAVAILABLE"
}

export type FreightResult = FreightQuote | FreightUnrated
