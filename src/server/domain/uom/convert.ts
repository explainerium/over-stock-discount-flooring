import Decimal from "decimal.js"
import { UomError, type Conversion, type ProductFamily, type ProductSpec, type Uom } from "./types"

/**
 * Unit conversion and rounding.
 *
 * One engine, called from five places — cart, order submission, the owner's
 * admin edit, the QuickBooks invoice and the public coverage calculator. If any
 * of them computes a box count on its own, the five stop agreeing and the
 * disagreement surfaces as a dealer on the phone.
 *
 * Two rules, both taken from the client's own worked example:
 *
 *   "if someone types in 1200 square feet. It rounds to 51 boxes 1205 sf."
 *
 *   1. Boxes round UP. You cannot buy part of a box, so 50.76 is 51.
 *   2. Coverage is the box count multiplied back out — 51 × 23.64 = 1205.64 —
 *      and the line is billed on that, not on the 1200 the dealer typed. They
 *      are taking delivery of 51 boxes.
 *
 * Truncating 1205.64 to "1205" is a *display* decision and lives in the
 * formatting layer. Everything returned here is exact.
 */

/** Whole units, always up. `Decimal.ROUND_CEIL` on a value that is already whole is a no-op. */
const ceil = (value: Decimal): Decimal => value.toDecimalPlaces(0, Decimal.ROUND_CEIL)

/**
 * A product is whatever its numbers make it.
 *
 * Checked in this order because a flooring product also has a pricing UOM of
 * SQFT and would otherwise be indistinguishable from a roll good.
 */
export function familyOf(spec: ProductSpec): ProductFamily {
	if (spec.sqFtPerBox != null) return "FLOORING"
	if (spec.sqFtPerRoll != null || spec.pricingUom === "ROLL") return "ROLL"
	if (spec.pricingUom === "LF") return "LINEAR"
	return "UNIT"
}

/** The discrete unit a product ships in, which is not always the unit it is priced in. */
export function sellableUomOf(spec: ProductSpec): Uom {
	switch (familyOf(spec)) {
		case "FLOORING":
			return "BOX"
		case "ROLL":
			return "ROLL"
		case "LINEAR":
			// Only a stick is discrete. Without a stick length we have no basis to
			// round on, so linear feet stay continuous — see resolve() below.
			return spec.lfPerStick != null ? "STICK" : "LF"
		case "UNIT":
			return "EACH"
	}
}

/**
 * Converts an entered quantity into whole sellable units and a billable amount.
 *
 * @param wasteFactorPct Added before rounding, not after. An installer ordering
 *   10% waste on 1,200 sq ft wants 1,320 sq ft of coverage, then whatever box
 *   count covers it — rounding first and padding second gives a different and
 *   wrong answer.
 */
export function resolve(
	spec: ProductSpec,
	enteredUom: Uom,
	enteredQtyInput: Decimal.Value,
	wasteFactorPct = 0,
): Conversion {
	const enteredQty = new Decimal(enteredQtyInput)

	if (!enteredQty.isFinite() || enteredQty.lessThanOrEqualTo(0)) {
		throw new UomError("Quantity must be greater than zero.", "QUANTITY_INVALID")
	}
	if (!spec.orderUoms.includes(enteredUom)) {
		throw new UomError(
			`This product cannot be ordered by ${enteredUom}.`,
			"UOM_NOT_ALLOWED",
		)
	}
	if (wasteFactorPct < 0 || wasteFactorPct > 100) {
		throw new UomError("Waste factor must be between 0 and 100 percent.", "QUANTITY_INVALID")
	}

	const withWaste = enteredQty.times(new Decimal(100).plus(wasteFactorPct)).dividedBy(100)
	const family = familyOf(spec)

	const base = {
		enteredQty,
		enteredUom,
		wasteFactorPct,
		billableUom: spec.pricingUom,
	}

	if (family === "FLOORING") {
		if (spec.sqFtPerBox == null) {
			throw new UomError("Flooring product is missing sq ft per box.", "SPEC_INCOMPLETE")
		}
		const sqFtPerBox = new Decimal(spec.sqFtPerBox)
		if (sqFtPerBox.lessThanOrEqualTo(0)) {
			throw new UomError("Sq ft per box must be greater than zero.", "SPEC_INCOMPLETE")
		}

		let boxes: Decimal
		switch (enteredUom) {
			case "SQFT":
				boxes = ceil(withWaste.dividedBy(sqFtPerBox))
				break
			case "BOX":
				// An explicit box count is already the answer. Waste factor is a
				// coverage concept and does not apply to a count someone chose.
				boxes = ceil(enteredQty)
				break
			case "PALLET": {
				if (!spec.boxesPerPallet) {
					throw new UomError(
						"Product is missing boxes per pallet.",
						"SPEC_INCOMPLETE",
					)
				}
				boxes = ceil(enteredQty.times(spec.boxesPerPallet))
				break
			}
			default:
				throw new UomError(
					`Flooring cannot be ordered by ${enteredUom}.`,
					"CONVERSION_UNSUPPORTED",
				)
		}

		const coverageSqFt = boxes.times(sqFtPerBox)

		return {
			...base,
			sellableUom: "BOX",
			sellableQty: boxes,
			billableQty: coverageSqFt,
			boxes: boxes.toNumber(),
			pallets: spec.boxesPerPallet ? boxes.dividedBy(spec.boxesPerPallet) : undefined,
			coverageSqFt,
			weightLb: spec.lbPerBox != null ? boxes.times(spec.lbPerBox) : undefined,
		}
	}

	if (family === "LINEAR") {
		const lfPerStick = spec.lfPerStick != null ? new Decimal(spec.lfPerStick) : null

		// No stick length on file. The current site prices baseboard and quarter
		// round per linear foot and says nothing about how it is bundled, so
		// there is nothing to round to — inventing a stick length here would
		// quietly overcharge. Pending the client's answer, LF is continuous.
		if (lfPerStick == null) {
			if (enteredUom !== "LF") {
				throw new UomError(
					`Ordering by ${enteredUom} needs a stick length on the product.`,
					"SPEC_INCOMPLETE",
				)
			}
			return {
				...base,
				sellableUom: "LF",
				sellableQty: withWaste,
				billableQty: withWaste,
			}
		}

		let sticks: Decimal
		switch (enteredUom) {
			case "LF":
				sticks = ceil(withWaste.dividedBy(lfPerStick))
				break
			case "STICK":
				sticks = ceil(enteredQty)
				break
			case "BUNDLE": {
				if (!spec.sticksPerBundle) {
					throw new UomError(
						"Product is missing sticks per bundle.",
						"SPEC_INCOMPLETE",
					)
				}
				sticks = ceil(enteredQty.times(spec.sticksPerBundle))
				break
			}
			default:
				throw new UomError(
					`Trim cannot be ordered by ${enteredUom}.`,
					"CONVERSION_UNSUPPORTED",
				)
		}

		return {
			...base,
			sellableUom: "STICK",
			sellableQty: sticks,
			billableQty: sticks.times(lfPerStick),
		}
	}

	if (family === "ROLL") {
		const sqFtPerRoll = spec.sqFtPerRoll != null ? new Decimal(spec.sqFtPerRoll) : null

		let rolls: Decimal
		switch (enteredUom) {
			case "ROLL":
				rolls = ceil(enteredQty)
				break
			case "SQFT": {
				if (sqFtPerRoll == null || sqFtPerRoll.lessThanOrEqualTo(0)) {
					throw new UomError(
						"Product is missing sq ft per roll.",
						"SPEC_INCOMPLETE",
					)
				}
				rolls = ceil(withWaste.dividedBy(sqFtPerRoll))
				break
			}
			default:
				throw new UomError(
					`Roll goods cannot be ordered by ${enteredUom}.`,
					"CONVERSION_UNSUPPORTED",
				)
		}

		return {
			...base,
			sellableUom: "ROLL",
			sellableQty: rolls,
			// Priced per roll unless the product is quoted per square foot, in
			// which case the covered area is what gets billed.
			billableQty: spec.pricingUom === "SQFT" && sqFtPerRoll ? rolls.times(sqFtPerRoll) : rolls,
			coverageSqFt: sqFtPerRoll ? rolls.times(sqFtPerRoll) : undefined,
		}
	}

	// UNIT — nothing to convert, but the count is still whole.
	if (enteredUom !== "EACH") {
		throw new UomError(`This product can only be ordered by EACH.`, "CONVERSION_UNSUPPORTED")
	}
	const units = ceil(enteredQty)
	return {
		...base,
		sellableUom: "EACH",
		sellableQty: units,
		billableQty: units,
	}
}
