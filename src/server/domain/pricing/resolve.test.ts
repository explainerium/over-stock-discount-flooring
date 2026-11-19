import Decimal from "decimal.js"
import { describe, expect, it } from "vitest"
import { resolve } from "../uom"
import { hasPrice, lineTotal, resolvePrice, sumLines } from "./resolve"
import { PricingError } from "./types"

const gold = { listPrice: "2.19", pricingUom: "SQFT" }

describe("precedence", () => {
	it("prefers a price set on the product for this dealer over everything else", () => {
		const result = resolvePrice(
			gold,
			{ discountPct: "15", tierDiscountPct: "20" },
			{ price: "1.75" },
		)

		expect(result.unitPrice.toString()).toBe("1.75")
		expect(result.source).toBe("PRODUCT_PRICE")
	})

	it("prefers a product discount over the dealer's flat rate", () => {
		const result = resolvePrice(gold, { discountPct: "15" }, { discountPct: "25" })

		expect(result.source).toBe("PRODUCT_DISCOUNT")
		expect(result.unitPrice.toString()).toBe("1.6425")
	})

	it("prefers the dealer's own rate over their tier", () => {
		// The point of having both. A tier is where everyone in that band starts;
		// a dealer's own rate is the exception agreed on top of it.
		const result = resolvePrice(gold, { discountPct: "15", tierDiscountPct: "20" })

		expect(result.source).toBe("DEALER_DISCOUNT")
		expect(result.discountPct.toString()).toBe("15")
	})

	it("falls back to the tier when the dealer has no rate of their own", () => {
		const result = resolvePrice(gold, { tierDiscountPct: "20" })

		expect(result.source).toBe("TIER_DISCOUNT")
		expect(result.unitPrice.toString()).toBe("1.752")
	})

	it("prices a whole series for a dealer, ahead of their flat rate and tier", () => {
		const result = resolvePrice(
			gold,
			{ discountPct: "15", tierDiscountPct: "20" },
			{ seriesPrice: "1.65" },
		)

		expect(result.source).toBe("SERIES_PRICE")
		expect(result.unitPrice.toString()).toBe("1.65")
		expect(result.discountPct.toString()).toBe("24.66")
	})

	it("lets a product's own price or discount beat its series price", () => {
		expect(resolvePrice(gold, {}, { price: "1.50", seriesPrice: "1.65" }).source).toBe(
			"PRODUCT_PRICE",
		)
		expect(resolvePrice(gold, {}, { discountPct: "30", seriesPrice: "1.65" }).source).toBe(
			"PRODUCT_DISCOUNT",
		)
	})

	it("takes a series price with no list price, and skips a percentage that cannot apply", () => {
		const unlisted = { listPrice: null, pricingUom: "SQFT" }
		const result = resolvePrice(unlisted, {}, { discountPct: "10", seriesPrice: "1.39" })

		expect(result.source).toBe("SERIES_PRICE")
		expect(result.unitPrice.toString()).toBe("1.39")
		expect(result.listPrice).toBeNull()
		expect(hasPrice(unlisted, { seriesPrice: "1.39" })).toBe(true)
	})

	it("charges list when nothing is set", () => {
		const result = resolvePrice(gold)

		expect(result.source).toBe("LIST")
		expect(result.unitPrice.toString()).toBe("2.19")
		expect(result.discountPct.toString()).toBe("0")
	})
})

describe("guards", () => {
	it("refuses to price a product that has no price", () => {
		// Not zero. A pallet shipping for nothing is worse than an error.
		expect(() => resolvePrice({ listPrice: null, pricingUom: "SQFT" })).toThrow(PricingError)
		expect(() => resolvePrice({ pricingUom: "SQFT" })).toThrow(/no list price/)
	})

	it("takes a dealer's own price on a product with no list price", () => {
		// The client prices every dealer by hand, so list is often never set.
		const result = resolvePrice(
			{ listPrice: null, pricingUom: "SQFT" },
			{ discountPct: "15" },
			{ price: "1.49" },
		)

		expect(result.unitPrice.toString()).toBe("1.49")
		expect(result.source).toBe("PRODUCT_PRICE")
		expect(result.listPrice).toBeNull()
		expect(result.discountPct.toString()).toBe("0")
	})

	it("cannot take a percentage off a list price that does not exist", () => {
		const unlisted = { listPrice: null, pricingUom: "SQFT" }
		expect(() => resolvePrice(unlisted, {}, { discountPct: "10" })).toThrow(/no list price/)
		expect(() => resolvePrice(unlisted, { discountPct: "10" })).toThrow(/no list price/)
	})

	it("knows when there is something to price", () => {
		expect(hasPrice(gold)).toBe(true)
		expect(hasPrice({ listPrice: null, pricingUom: "SQFT" }, { price: "1.49" })).toBe(true)
		expect(hasPrice({ listPrice: null, pricingUom: "SQFT" }, { discountPct: "10" })).toBe(false)
		expect(hasPrice({ listPrice: "", pricingUom: "SQFT" })).toBe(false)
	})

	it("rejects a discount outside 0–100", () => {
		expect(() => resolvePrice(gold, { discountPct: "120" })).toThrow(/between 0 and 100/)
		expect(() => resolvePrice(gold, { discountPct: "-5" })).toThrow(/between 0 and 100/)
	})

	it("rejects a negative price", () => {
		expect(() => resolvePrice(gold, {}, { price: "-1" })).toThrow(/cannot be negative/)
	})

	it("treats a zero discount as no discount, not as a discount of nothing", () => {
		// Otherwise an order that saved nothing reports DEALER_DISCOUNT, and the
		// owner is asked to explain a discount that does not exist.
		const result = resolvePrice(gold, { discountPct: "0", tierDiscountPct: "20" })
		expect(result.source).toBe("TIER_DISCOUNT")
	})

	it("handles an override above list — a special order can cost more", () => {
		const result = resolvePrice(gold, {}, { price: "2.50" })
		expect(result.source).toBe("PRODUCT_PRICE")
		expect(result.discountPct.isNegative()).toBe(true)
	})
})

describe("line totals", () => {
	it("rounds once, at the line", () => {
		// 51 boxes of Gold is 1,205.64 sq ft. At $2.19 that is $2,640.3516,
		// which invoices as $2,640.35.
		expect(lineTotal("2.19", "1205.64").toString()).toBe("2640.35")
	})

	it("does not round the unit price or the coverage on the way", () => {
		// Rounding coverage to 1,205 first gives 2,638.95 — a dollar and forty
		// cents adrift on one line, on a number the owner has already quoted.
		const roundedEarly = lineTotal("2.19", "1205")
		const exact = lineTotal("2.19", "1205.64")
		expect(roundedEarly.toString()).not.toBe(exact.toString())
	})

	it("rounds half up, the way an invoice does", () => {
		expect(lineTotal("1.005", "1").toString()).toBe("1.01")
		expect(lineTotal("2.125", "1").toString()).toBe("2.13")
	})

	it("sums without drifting", () => {
		const lines = ["10.01", "10.02", "10.03", "0.01"]
		expect(sumLines(lines).toString()).toBe("30.07")
	})

	it("refuses a negative quantity", () => {
		expect(() => lineTotal("2.19", "-1")).toThrow(PricingError)
	})
})

describe("end to end with the UOM engine", () => {
	it("prices what actually ships, not what was typed", () => {
		// A dealer on 15% types 1,200 sq ft of Gold. They receive 51 boxes —
		// 1,205.64 sq ft — and that is the area the line is billed on.
		const conversion = resolve(
			{
				pricingUom: "SQFT",
				orderUoms: ["SQFT", "BOX", "PALLET"],
				sqFtPerBox: "23.64",
				boxesPerPallet: 55,
			},
			"SQFT",
			1200,
		)

		const price = resolvePrice(gold, { discountPct: "15" })
		const total = lineTotal(price.unitPrice, conversion.billableQty)

		expect(conversion.boxes).toBe(51)
		expect(conversion.billableQty.toString()).toBe("1205.64")
		expect(price.unitPrice.toString()).toBe("1.8615")
		// toFixed, not toString: Decimal drops trailing zeros, so the exact value
		// 2244.30 stringifies as "2244.3". Money is displayed through
		// lib/format/money for exactly this reason.
		expect(total.toFixed(2)).toBe("2244.30")
	})

	it("prices trim in linear feet, not square feet", () => {
		// Baseboard at $1.09/LF with no boxes and no coverage anywhere in sight.
		const conversion = resolve({ pricingUom: "LF", orderUoms: ["LF"] }, "LF", "37.5")
		const price = resolvePrice({ listPrice: "1.09", pricingUom: "LF" }, { discountPct: "10" })

		expect(price.unitPrice.toString()).toBe("0.981")
		expect(lineTotal(price.unitPrice, conversion.billableQty).toFixed(2)).toBe("36.79")
	})

	it("never loses a cent to floating point", () => {
		// The whole reason money is Decimal here. In IEEE 754,
		// 0.1 + 0.2 === 0.30000000000000004 — and an invoice built on that
		// disagrees with QuickBooks by amounts nobody can account for.
		expect(new Decimal("0.1").plus("0.2").toString()).toBe("0.3")
		expect(sumLines(["0.1", "0.2"]).toString()).toBe("0.3")
	})
})
