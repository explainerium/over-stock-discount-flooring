import Decimal from "decimal.js"
import {
	PricingError,
	type DealerPricing,
	type PriceResult,
	type ProductOverride,
	type ProductPricing,
} from "./types"

/**
 * What a dealer pays.
 *
 * The client has not said whether he prices by flat discount, per product, or
 * by tier, so the engine does all three and the answer decides which admin
 * screens he ever opens. That is the plan's position and it is what keeps this
 * off the critical path.
 *
 * Precedence runs most-specific to least, and the order is a commercial
 * judgement rather than an arbitrary one:
 *
 *   1. A price set on this product for this dealer. Somebody typed a number
 *      against a name; nothing should quietly override that.
 *   2. A discount set on this product for this dealer.
 *   3. The dealer's own flat discount. Negotiated with them directly.
 *   4. Their tier's discount. The default they were negotiated away from.
 *   5. List.
 *
 * A dealer's own rate beating their tier is the point of having both: the tier
 * is where everyone in that band starts, and an individual arrangement is the
 * exception that was agreed on top.
 *
 * A list price is optional. The client prices each dealer by hand — "they will
 * all have different pricing" — so a price set on a product for a dealer
 * stands on its own. Every other step is a percentage, and a percentage of
 * nothing is not a price, so without a list price those steps cannot apply.
 */

/** Per-unit prices carry four decimals — per-square-foot pricing genuinely runs that deep. */
const UNIT_DP = 4

function toDecimal(value: Decimal.Value): Decimal {
	return value instanceof Decimal ? value : new Decimal(value)
}

function validDiscount(value: Decimal.Value | null | undefined): Decimal | null {
	if (value === null || value === undefined || value === "") return null

	const pct = toDecimal(value)
	if (!pct.isFinite() || pct.lessThan(0) || pct.greaterThan(100)) {
		throw new PricingError("A discount must be between 0 and 100 percent.", "INVALID_DISCOUNT")
	}
	// Zero is not a discount, it is the absence of one. Treating it as a discount
	// would report `DEALER_DISCOUNT` on an order that saved nothing.
	return pct.isZero() ? null : pct
}

function validPrice(value: Decimal.Value | null | undefined): Decimal | null {
	if (value === null || value === undefined || value === "") return null

	const price = toDecimal(value)
	if (!price.isFinite() || price.lessThan(0)) {
		throw new PricingError("A price cannot be negative.", "INVALID_PRICE")
	}
	return price
}

const applyDiscount = (list: Decimal, pct: Decimal): Decimal =>
	list.times(new Decimal(100).minus(pct)).dividedBy(100).toDecimalPlaces(UNIT_DP)

/**
 * Whether `resolvePrice` has anything to work with: a list price, or a price
 * set for this dealer. The catalogue and the order check this first, so an
 * unpriced product reads as "not priced yet" rather than as an error.
 */
export function hasPrice(product: ProductPricing, override: ProductOverride = {}): boolean {
	const set = (value: Decimal.Value | null | undefined) =>
		value !== null && value !== undefined && value !== ""
	return set(product.listPrice) || set(override.price)
}

export function resolvePrice(
	product: ProductPricing,
	dealer: DealerPricing = {},
	override: ProductOverride = {},
): PriceResult {
	const listPrice = validPrice(product.listPrice)
	const overridePrice = validPrice(override.price)

	if (overridePrice !== null) {
		return {
			listPrice,
			pricingUom: product.pricingUom,
			unitPrice: overridePrice.toDecimalPlaces(UNIT_DP),
			source: "PRODUCT_PRICE",
			// An override can be above list as well as below — a special order
			// might cost more — so the saving is derived rather than assumed.
			// With no list price there is nothing to have saved against.
			discountPct:
				listPrice === null || listPrice.isZero()
					? new Decimal(0)
					: listPrice
							.minus(overridePrice)
							.dividedBy(listPrice)
							.times(100)
							.toDecimalPlaces(2),
		}
	}

	if (listPrice === null) {
		// Deliberately loud. A product with no price is not a product priced at
		// zero, and quietly returning zero is how a pallet ships for nothing.
		throw new PricingError(
			"This product has no list price and no price for this dealer, so it cannot be priced.",
			"NO_LIST_PRICE",
		)
	}

	const base = { listPrice, pricingUom: product.pricingUom }

	const overrideDiscount = validDiscount(override.discountPct)
	if (overrideDiscount !== null) {
		return {
			...base,
			unitPrice: applyDiscount(listPrice, overrideDiscount),
			source: "PRODUCT_DISCOUNT",
			discountPct: overrideDiscount,
		}
	}

	const dealerDiscount = validDiscount(dealer.discountPct)
	if (dealerDiscount !== null) {
		return {
			...base,
			unitPrice: applyDiscount(listPrice, dealerDiscount),
			source: "DEALER_DISCOUNT",
			discountPct: dealerDiscount,
		}
	}

	const tierDiscount = validDiscount(dealer.tierDiscountPct)
	if (tierDiscount !== null) {
		return {
			...base,
			unitPrice: applyDiscount(listPrice, tierDiscount),
			source: "TIER_DISCOUNT",
			discountPct: tierDiscount,
		}
	}

	return {
		...base,
		unitPrice: listPrice.toDecimalPlaces(UNIT_DP),
		source: "LIST",
		discountPct: new Decimal(0),
	}
}

/**
 * A line total.
 *
 * This is the one place the money is rounded. Everything upstream — the unit
 * price at four decimals, the coverage figure from the UOM engine at whatever
 * precision it lands on — stays exact, and the cents appear here.
 *
 * Rounding earlier is what makes a portal total and a QuickBooks invoice differ
 * by a penny, and the penny is on a number the owner has already sent a
 * customer.
 */
export function lineTotal(unitPrice: Decimal.Value, billableQty: Decimal.Value): Decimal {
	const price = toDecimal(unitPrice)
	const qty = toDecimal(billableQty)

	if (!price.isFinite() || !qty.isFinite() || price.lessThan(0) || qty.lessThan(0)) {
		throw new PricingError("A line total needs a positive price and quantity.", "INVALID_PRICE")
	}

	// ROUND_HALF_UP: the convention people expect on an invoice, and the one
	// QuickBooks uses. Banker's rounding would be defensible and would also
	// produce totals that do not match the invoice.
	return price.times(qty).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
}

/** Adds line totals without letting the sum drift. */
export function sumLines(totals: Decimal.Value[]): Decimal {
	return totals
		.reduce<Decimal>((sum, value) => sum.plus(toDecimal(value)), new Decimal(0))
		.toDecimalPlaces(2)
}
