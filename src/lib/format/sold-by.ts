import Decimal from "decimal.js"

/**
 * "Sold by", as the client's sheet means it.
 *
 * Flooring is priced per square foot but nobody buys a square foot: it leaves
 * the warehouse in boxes, so a product a dealer can order by the box is sold by
 * the box. Trim is the same idea in one dimension — "They're sold per piece.
 * But people like it to be priced per LF." — so a product with a piece length
 * is sold by the piece and the label says what it is priced in. Everything
 * else is sold in the unit it is priced in: a stair nose each, padding by the
 * roll.
 */
const PRICED_IN: Record<string, string> = {
	SQFT: "Square foot",
	LF: "Linear foot",
	EACH: "Each",
	ROLL: "Roll",
}

export function soldByLabel(
	pricingUom: string,
	orderUoms: readonly string[],
	lfPerPiece?: string | null,
): string {
	if (orderUoms.includes("BOX")) return "Box"
	if (lfPerPiece && orderUoms.includes("STICK")) {
		return `${formatFeet(lfPerPiece)} piece, priced per linear foot`
	}
	return PRICED_IN[pricingUom] ?? pricingUom.toLowerCase()
}

/** "12 ft" — a stored "12.0000" read as a person would say it. */
export function formatFeet(value: Decimal.Value): string {
	return `${new Decimal(value).toString()} ft`
}

/** "1 piece", "9 pieces". */
export function formatPieces(count: number): string {
	return `${count} ${count === 1 ? "piece" : "pieces"}`
}

/**
 * The whole pieces an order line ships as, or null for anything not sold by
 * the piece. Read off the line's resolved quantity, which the order engine has
 * already rounded up — never recomputed here.
 */
export function piecesOf(line: {
	uomBase: string
	qtyBase: { toString(): string }
}): number | null {
	return line.uomBase === "STICK" ? new Decimal(line.qtyBase.toString()).toNumber() : null
}
