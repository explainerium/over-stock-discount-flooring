import { describe, expect, it } from "vitest"
import { stockWarning } from "./stock"

describe("what a dealer is told before they send an order", () => {
	it("says nothing when everything is in stock", () => {
		// A warning that fires on every order is a warning nobody reads.
		expect(stockWarning(["IN_STOCK", "IN_STOCK"])).toBeNull()
		expect(stockWarning([])).toBeNull()
	})

	it("names the problem and says who resolves it", () => {
		const note = stockWarning(["OUT", "IN_STOCK"])
		expect(note).toContain("1 line is out of stock")
		// The dealer cannot act on this; the owner confirms a date. Saying so
		// is what stops it becoming a phone call.
		expect(note).toContain("confirm a date")
	})

	it("counts each kind separately", () => {
		expect(stockWarning(["OUT", "OUT", "SPECIAL_ORDER"])).toContain("2 lines are out of stock")
		expect(stockWarning(["OUT", "OUT", "SPECIAL_ORDER"])).toContain("1 is a special order")
	})

	it("mentions low stock only when nothing worse is on the order", () => {
		// "Running low" next to "out of stock" is noise — the dealer is already
		// waiting on a date either way.
		expect(stockWarning(["LOW", "IN_STOCK"])).toContain("running low")
		expect(stockWarning(["LOW", "OUT"])).not.toContain("running low")
	})
})
