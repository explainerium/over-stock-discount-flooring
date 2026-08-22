import Decimal from "decimal.js"

/**
 * Coverage display.
 *
 * The client's own worked example ends "51 boxes 1205 sf", and 51 × 23.64 is
 * 1205.64 — so coverage shown to a dealer is TRUNCATED, never rounded. 1205.64
 * reads "1205" and not "1206".
 *
 * It looks like a nitpick and is not: a dealer who sees a number one square
 * foot higher than the one on their invoice picks up the phone, and the owner
 * spends his afternoon explaining rounding.
 *
 * The exact value still exists — `resolve()` returns it and the line is billed
 * on it. Only the label is trimmed.
 */

/** Exact truncation toward zero. Keeps the value a Decimal for further maths. */
export function truncateCoverage(sqFt: Decimal.Value): Decimal {
	return new Decimal(sqFt).toDecimalPlaces(0, Decimal.ROUND_DOWN)
}

/** "1,205" — truncated, with thousands separators. */
export function formatCoverage(sqFt: Decimal.Value): string {
	return truncateCoverage(sqFt).toNumber().toLocaleString("en-US")
}

/** "51 boxes / 1,205 sq ft" — the phrase the calculator and cart both show. */
export function formatBoxesAndCoverage(boxes: number, sqFt: Decimal.Value): string {
	const unit = boxes === 1 ? "box" : "boxes"
	return `${boxes.toLocaleString("en-US")} ${unit} / ${formatCoverage(sqFt)} sq ft`
}
