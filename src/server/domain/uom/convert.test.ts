import { describe, expect, it } from "vitest"
import { formatBoxesAndCoverage, truncateCoverage } from "@/lib/format/coverage"
import { familyOf, resolve, sellableUomOf } from "./convert"
import { UomError, type ProductSpec } from "./types"

/**
 * The specs below are the real ones, taken from the live catalog and checked
 * against themselves — boxes × sq ft/box matches the published sq ft/pallet in
 * every case, and pallets × lb/pallet lands just under the ~44,000 lb truckload
 * cap. They are not example numbers.
 */
const SERIES = {
	bronze: { sqFtPerBox: "28.68", boxesPerPallet: 55, lbPerBox: "49.4" },
	silver: { sqFtPerBox: "23.64", boxesPerPallet: 55, lbPerBox: "40.0" },
	silverW: { sqFtPerBox: "28.68", boxesPerPallet: 60, lbPerBox: "44.5" },
	gold: { sqFtPerBox: "23.64", boxesPerPallet: 55, lbPerBox: "40.0" },
	goldW: { sqFtPerBox: "23.90", boxesPerPallet: 55, lbPerBox: "40.5" },
} as const

const flooring = (series: (typeof SERIES)[keyof typeof SERIES]): ProductSpec => ({
	pricingUom: "SQFT",
	orderUoms: ["SQFT", "BOX", "PALLET"],
	...series,
})

/** Baseboard as the site sells it today: per linear foot, no stick length known. */
const baseboard: ProductSpec = { pricingUom: "LF", orderUoms: ["LF"] }

describe("the client's worked example", () => {
	/**
	 * "if someone types in 1200 square feet. It rounds to 51 boxes 1205 sf."
	 *
	 * That result is true for Silver and Gold and for nothing else. The earlier
	 * plan carried it as *the* acceptance test; three of the five series give a
	 * different answer, so the acceptance test is this table.
	 */
	const cases = [
		{ name: "Bronze", spec: SERIES.bronze, boxes: 42, display: "1,204" },
		{ name: "Silver", spec: SERIES.silver, boxes: 51, display: "1,205" },
		{ name: "Silver W", spec: SERIES.silverW, boxes: 42, display: "1,204" },
		{ name: "Gold", spec: SERIES.gold, boxes: 51, display: "1,205" },
		{ name: "Gold W", spec: SERIES.goldW, boxes: 51, display: "1,218" },
	]

	it.each(cases)(
		"$name: 1,200 sq ft → $boxes boxes / $display sq ft",
		({ spec, boxes, display }) => {
			const result = resolve(flooring(spec), "SQFT", 1200)

			expect(result.boxes).toBe(boxes)
			expect(formatBoxesAndCoverage(result.boxes!, result.coverageSqFt!)).toBe(
				`${boxes} boxes / ${display} sq ft`,
			)
		},
	)

	it("bills the coverage actually shipped, not the figure typed", () => {
		const result = resolve(flooring(SERIES.gold), "SQFT", 1200)

		// 51 × 23.64 = 1205.64. The dealer takes delivery of 51 whole boxes, so
		// that is the billable area — not the 1,200 they asked for.
		expect(result.coverageSqFt!.toString()).toBe("1205.64")
		expect(result.billableQty.toString()).toBe("1205.64")
		expect(result.billableUom).toBe("SQFT")
	})

	it("truncates coverage for display and never rounds it up", () => {
		// 1205.64 must read 1205. Rounding would show 1206 and put the site one
		// square foot away from the invoice.
		expect(truncateCoverage("1205.64").toString()).toBe("1205")
		expect(truncateCoverage("1204.56").toString()).toBe("1204")
		expect(truncateCoverage("1218.90").toString()).toBe("1218")
	})
})

describe("rounding", () => {
	it("rounds boxes up, always", () => {
		// 23.65 sq ft of a 23.64 product is two boxes, not one.
		expect(resolve(flooring(SERIES.gold), "SQFT", "23.65").boxes).toBe(2)
		expect(resolve(flooring(SERIES.gold), "SQFT", "0.01").boxes).toBe(1)
	})

	it("does not add a box when the area divides exactly", () => {
		// One pallet's worth, to the square foot: 55 × 23.64 = 1300.20.
		expect(resolve(flooring(SERIES.gold), "SQFT", "1300.20").boxes).toBe(55)
	})
})

describe("ordering by box and pallet", () => {
	it("takes a box count as given", () => {
		const result = resolve(flooring(SERIES.silverW), "BOX", 10)
		expect(result.boxes).toBe(10)
		expect(result.coverageSqFt!.toString()).toBe("286.8")
	})

	it("expands pallets using the series' own boxes-per-pallet", () => {
		// Silver W packs 60 to a pallet where every other series packs 55 — the
		// exact kind of difference a single shared spec table would have lost.
		expect(resolve(flooring(SERIES.silverW), "PALLET", 1).boxes).toBe(60)
		expect(resolve(flooring(SERIES.silver), "PALLET", 1).boxes).toBe(55)
	})

	it("reports pallets back as a fraction", () => {
		const result = resolve(flooring(SERIES.silver), "BOX", 110)
		expect(result.pallets!.toString()).toBe("2")
	})
})

describe("waste factor", () => {
	it("applies before rounding, not after", () => {
		// 1200 + 10% = 1320 sq ft of coverage wanted; 1320 / 23.64 = 55.84 → 56.
		// Padding the box count instead would give 51 → 56.1 → 57, one box more
		// and roughly $60 of flooring nobody asked for.
		expect(resolve(flooring(SERIES.gold), "SQFT", 1200, 10).boxes).toBe(56)
		expect(resolve(flooring(SERIES.gold), "SQFT", 1200, 5).boxes).toBe(54)
		expect(resolve(flooring(SERIES.gold), "SQFT", 1200, 0).boxes).toBe(51)
	})

	it("ignores waste on an explicit box count", () => {
		// Someone who typed "10 boxes" chose 10 boxes.
		expect(resolve(flooring(SERIES.gold), "BOX", 10, 10).boxes).toBe(10)
	})

	it("reports the allowance it applied, not the one it was handed", () => {
		// This is what gets stored on the line and printed back to the owner.
		// Reporting 10 on a box count would put "10 boxes + 10% waste" on the
		// approval screen over an order that had no allowance added at all.
		expect(resolve(flooring(SERIES.gold), "SQFT", 1200, 10).wasteFactorPct).toBe(10)
		expect(resolve(flooring(SERIES.gold), "BOX", 10, 10).wasteFactorPct).toBe(0)
		expect(resolve(flooring(SERIES.gold), "PALLET", 2, 10).wasteFactorPct).toBe(0)
		expect(resolve(baseboard, "LF", 100, 10).wasteFactorPct).toBe(10)
	})
})

describe("weight", () => {
	it("derives shipment weight from the box count", () => {
		// Freight needs this and no LTL rate can be quoted without it.
		expect(resolve(flooring(SERIES.bronze), "BOX", 55).weightLb!.toString()).toBe("2717")
		expect(resolve(flooring(SERIES.silverW), "PALLET", 1).weightLb!.toString()).toBe("2670")
	})
})

describe("accessories are not flooring", () => {
	it("treats baseboard as continuous linear feet", () => {
		// $1.09/LF on the live site, with no stick length published. Inventing
		// one here would quietly overcharge, so LF stays continuous until the
		// client tells us how it is bundled.
		const result = resolve(baseboard, "LF", "37.5")

		expect(result.sellableUom).toBe("LF")
		expect(result.billableQty.toString()).toBe("37.5")
		expect(result.boxes).toBeUndefined()
		expect(result.coverageSqFt).toBeUndefined()
	})

	it("rounds up to whole sticks once a stick length is known", () => {
		const trim: ProductSpec = {
			pricingUom: "LF",
			orderUoms: ["LF", "STICK", "BUNDLE"],
			lfPerStick: 16,
			sticksPerBundle: 5,
		}
		// 37.5 ft over 16 ft sticks is 2.34 → 3 sticks → billed on 48 ft.
		const byFoot = resolve(trim, "LF", "37.5")
		expect(byFoot.sellableQty.toString()).toBe("3")
		expect(byFoot.billableQty.toString()).toBe("48")

		expect(resolve(trim, "BUNDLE", 2).sellableQty.toString()).toBe("10")
	})

	it("refuses a unit the product is not sold in", () => {
		expect(() => resolve(baseboard, "BOX", 5)).toThrow(UomError)
		expect(() => resolve(flooring(SERIES.gold), "LF", 5)).toThrow(UomError)
	})
})

describe("guards", () => {
	it("rejects zero and negative quantities", () => {
		expect(() => resolve(flooring(SERIES.gold), "SQFT", 0)).toThrow(/greater than zero/)
		expect(() => resolve(flooring(SERIES.gold), "SQFT", -5)).toThrow(/greater than zero/)
	})

	it("rejects an out-of-range waste factor", () => {
		expect(() => resolve(flooring(SERIES.gold), "SQFT", 100, -1)).toThrow(UomError)
		expect(() => resolve(flooring(SERIES.gold), "SQFT", 100, 101)).toThrow(UomError)
	})

	it("fails loudly when a pallet order has no boxes-per-pallet", () => {
		const incomplete: ProductSpec = {
			pricingUom: "SQFT",
			orderUoms: ["SQFT", "PALLET"],
			sqFtPerBox: "23.64",
		}
		expect(() => resolve(incomplete, "PALLET", 1)).toThrow(/boxes per pallet/)
	})
})

describe("family detection", () => {
	it("classifies by the numbers on the spec, not by a label", () => {
		expect(familyOf(flooring(SERIES.gold))).toBe("FLOORING")
		expect(familyOf(baseboard)).toBe("LINEAR")
		expect(familyOf({ pricingUom: "SQFT", orderUoms: ["ROLL"], sqFtPerRoll: 100 })).toBe("ROLL")
		expect(familyOf({ pricingUom: "EACH", orderUoms: ["EACH"] })).toBe("UNIT")
	})

	it("knows what ships even when it differs from what is priced", () => {
		// Priced per square foot, shipped as boxes.
		expect(sellableUomOf(flooring(SERIES.gold))).toBe("BOX")
		expect(sellableUomOf(baseboard)).toBe("LF")
	})
})
