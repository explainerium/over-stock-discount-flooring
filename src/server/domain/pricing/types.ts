import type Decimal from "decimal.js"

/**
 * Per-dealer pricing.
 *
 * Plain values, no Prisma types — same rule as the UOM engine. The pricing
 * layer is called from the portal catalogue, the cart, the order, the admin
 * editor and the invoice, and only some of those have a database row to hand.
 */

/**
 * Everything about a dealer that affects what they pay.
 *
 * Nullable throughout because the client has not said which model he uses. A
 * dealer with nothing set pays list, which is the safe answer to give when
 * nobody has decided anything.
 */
export interface DealerPricing {
	/** A flat percentage off list, across everything. */
	discountPct?: Decimal.Value | null
	/** The band they sit in, if the client prices by band. */
	tierDiscountPct?: Decimal.Value | null
}

/** A negotiated exception for one product. */
export interface ProductOverride {
	/** An absolute price in the product's pricing unit. */
	price?: Decimal.Value | null
	/** Or a percentage off list, for this product only. */
	discountPct?: Decimal.Value | null
}

export interface ProductPricing {
	/** The published price, in `pricingUom`. Null means the product has no price yet. */
	listPrice?: Decimal.Value | null
	/** What the price is quoted per — square foot for flooring, linear foot for trim. */
	pricingUom: string
}

/**
 * Where a price came from.
 *
 * Recorded rather than inferred, because the owner will be asked why a dealer
 * is seeing a particular number and "it is 15% off, from their tier" is a
 * different conversation from "it is the price you set on that product".
 */
export type PriceSource =
	"PRODUCT_PRICE" | "PRODUCT_DISCOUNT" | "DEALER_DISCOUNT" | "TIER_DISCOUNT" | "LIST"

export interface PriceResult {
	/** What this dealer pays, per unit of `pricingUom`. Four decimal places. */
	unitPrice: Decimal
	/**
	 * What it would cost without any of the above. Null when the product has no
	 * list price and this dealer has a price of their own on it.
	 */
	listPrice: Decimal | null
	pricingUom: string
	source: PriceSource
	/** Effective saving against list, as a percentage. Zero when there is none. */
	discountPct: Decimal
}

export class PricingError extends Error {
	constructor(
		message: string,
		readonly code: "NO_LIST_PRICE" | "INVALID_DISCOUNT" | "INVALID_PRICE",
	) {
		super(message)
		this.name = "PricingError"
	}
}
