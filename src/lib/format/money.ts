import Decimal from "decimal.js"

/**
 * Money display.
 *
 * Formatting only, never arithmetic. Every figure shown has already been
 * resolved by the pricing engine, and the moment this file starts multiplying
 * things is the moment the cart, the order, the admin editor and the invoice
 * stop agreeing on a total.
 *
 * `Decimal.toString()` is not enough on its own: it drops trailing zeros, so an
 * exact 2244.30 renders as "2244.3" and looks like a bug to anyone reading it.
 * Everything here goes through `toFixed` for that reason.
 */

/** "$2,244.30" — always two decimals, always separated. */
export function formatMoney(amount: Decimal.Value): string {
	const value = new Decimal(amount).toDecimalPlaces(2)
	return `$${Number(value.toFixed(2)).toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`
}

/**
 * "$2.1900 / sq ft" — a unit price, at the precision it is actually quoted.
 *
 * Per-square-foot pricing runs to three or four decimals in this trade, and
 * rounding it to two on screen means a dealer multiplies the displayed figure
 * by their square footage and gets a different answer from the line total.
 */
export function formatUnitPrice(amount: Decimal.Value, uom: string): string {
	const value = new Decimal(amount)
	const decimals = value.decimalPlaces() > 2 ? 4 : 2
	return `$${value.toFixed(decimals)} / ${UOM_LABEL[uom] ?? uom.toLowerCase()}`
}

/** "15% off" — or nothing at all, when there is no discount to announce. */
export function formatDiscount(pct: Decimal.Value): string | null {
	const value = new Decimal(pct)
	if (value.lessThanOrEqualTo(0)) return null
	return `${Number(value.toFixed(2))}% off`
}

const UOM_LABEL: Record<string, string> = {
	SQFT: "sq ft",
	LF: "linear ft",
	BOX: "box",
	PALLET: "pallet",
	STICK: "stick",
	BUNDLE: "bundle",
	EACH: "each",
	ROLL: "roll",
}

/** "sq ft", "linear ft" — the unit as a person would say it. */
export function uomLabel(uom: string): string {
	return UOM_LABEL[uom] ?? uom.toLowerCase()
}
