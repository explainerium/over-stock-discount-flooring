import { describe, expect, it } from "vitest"
import { accessorialCodesOf, quoteFreight, type QuoteInput } from "./quote"
import { findZone } from "./zones"
import type { ZoneRates } from "./types"

const local: ZoneRates = {
	id: "local",
	name: "Local delivery",
	states: [],
	zips: ["27260"],
	perPalletRate: "45",
	minCharge: "90",
}

const carolinas: ZoneRates = {
	id: "z1",
	name: "Zone 1",
	states: ["NC", "SC"],
	zips: ["27", "28"],
	perPalletRate: "125",
	perBoxRate: "9.50",
	minCharge: "250",
	ftlThresholdPallets: 8,
	ftlRate: "1450",
}

const northeast: ZoneRates = {
	id: "z3",
	name: "Zone 3",
	states: ["NY", "NJ"],
	zips: [],
	perPalletRate: "310",
	// No truckload rate on file, deliberately — this is the "needs a quote" path.
	ftlThresholdPallets: 8,
}

const RATES = [
	{ code: "RESIDENTIAL", label: "Residential", rate: "85" },
	{ code: "LIFTGATE", label: "Liftgate", rate: "110" },
	{ code: "LIMITED_ACCESS", label: "Limited access", rate: "75" },
]

function quote(overrides: Partial<QuoteInput> = {}) {
	return quoteFreight({
		mode: "ZONE",
		zones: [local, carolinas, northeast],
		accessorialRates: RATES,
		shipment: { state: "NC", zip: "27401", pallets: 2, boxes: 96, accessorials: [] },
		...overrides,
	})
}

describe("the arrangement on the account comes first", () => {
	it("does not rate an account the owner prices by hand", () => {
		const result = quote({ mode: "MANUAL" })

		expect(result.quoted).toBe(false)
		if (!result.quoted) expect(result.code).toBe("MANUAL_MODE")
	})

	it("says live rates are not connected rather than guessing at one", () => {
		const result = quote({ mode: "LIVE" })

		expect(result.quoted).toBe(false)
		if (!result.quoted) expect(result.code).toBe("LIVE_UNAVAILABLE")
	})

	it("charges a flat rate flat, accessorials included", () => {
		// The point of the arrangement. A liftgate on top would put back the
		// surprise the flat rate exists to remove.
		const result = quote({
			mode: "FLAT",
			flatRate: "250",
			shipment: {
				state: "NC",
				zip: "27401",
				pallets: 2,
				boxes: 96,
				accessorials: ["LIFTGATE", "RESIDENTIAL"],
			},
		})

		expect(result.quoted).toBe(true)
		if (result.quoted) {
			expect(result.amount.toString()).toBe("250")
			expect(result.accessorials).toEqual([])
			expect(result.basis).toBe("FLAT")
		}
	})

	it("will not invent a flat rate that was never set", () => {
		const result = quote({ mode: "FLAT", flatRate: null })

		expect(result.quoted).toBe(false)
		if (!result.quoted) expect(result.code).toBe("NO_RATE")
	})
})

describe("finding the zone", () => {
	it("prefers a ZIP to a state", () => {
		expect(findZone([carolinas, local], { state: "NC", zip: "27260" })?.id).toBe("local")
	})

	it("prefers the longer ZIP entry, whatever order the rows are in", () => {
		// The owner adds a local-delivery row years after the statewide one and
		// expects it to win. First-match would depend on which he typed first.
		expect(findZone([local, carolinas], { state: "NC", zip: "27260" })?.id).toBe("local")
		expect(findZone([carolinas, local], { state: "NC", zip: "27401" })?.id).toBe("z1")
	})

	it("rates a ZIP+4 on its first five digits", () => {
		expect(findZone([carolinas], { state: "NC", zip: "27401-1234" })?.id).toBe("z1")
	})

	it("falls back to the state when no ZIP entry matches", () => {
		expect(findZone([carolinas, northeast], { state: "NY", zip: "10001" })?.id).toBe("z3")
	})

	it("ignores a blank ZIP entry rather than matching the country on it", () => {
		const blank: ZoneRates = { id: "blank", name: "Blank", states: [], zips: ["", "  "] }

		expect(findZone([blank], { state: "NC", zip: "27401" })).toBeNull()
	})

	it("has no zone for a destination nobody has covered", () => {
		const result = quote({
			shipment: { state: "CA", zip: "90210", pallets: 2, boxes: 96, accessorials: [] },
		})

		expect(result.quoted).toBe(false)
		if (!result.quoted) {
			expect(result.code).toBe("NO_ZONE")
			expect(result.reason).toContain("CA 90210")
		}
	})
})

describe("what it charges", () => {
	it("rates by the pallet where the zone has a pallet rate", () => {
		const result = quote()

		expect(result.quoted).toBe(true)
		if (result.quoted) {
			expect(result.basis).toBe("PER_PALLET")
			expect(result.linehaul.toString()).toBe("250")
			expect(result.zoneName).toBe("Zone 1")
		}
	})

	it("rates by the box when the order never made a pallet", () => {
		const result = quote({
			shipment: { state: "NC", zip: "27401", pallets: 0, boxes: 40, accessorials: [] },
		})

		expect(result.quoted).toBe(true)
		if (result.quoted) {
			expect(result.basis).toBe("PER_BOX")
			// 40 × 9.50 = 380, which clears the 250 minimum on its own.
			expect(result.linehaul.toString()).toBe("380")
			expect(result.minChargeApplied).toBe(false)
		}
	})

	it("lifts a small shipment to the zone minimum", () => {
		const result = quote({
			shipment: { state: "NC", zip: "27260", pallets: 1, boxes: 48, accessorials: [] },
		})

		expect(result.quoted).toBe(true)
		if (result.quoted) {
			// Local delivery: one pallet at 45, floored at 90.
			expect(result.linehaul.toString()).toBe("90")
			expect(result.minChargeApplied).toBe(true)
		}
	})

	it("charges accessorials on top of the minimum, not inside it", () => {
		// A carrier applies the minimum to the linehaul and bills the liftgate
		// after it. Folding one into the other undercharges every small delivery
		// that needed one.
		const result = quote({
			shipment: {
				state: "NC",
				zip: "27260",
				pallets: 1,
				boxes: 48,
				accessorials: ["LIFTGATE"],
			},
		})

		expect(result.quoted).toBe(true)
		if (result.quoted) {
			expect(result.linehaul.toString()).toBe("90")
			expect(result.accessorialTotal.toString()).toBe("110")
			expect(result.amount.toString()).toBe("200")
		}
	})

	it("adds every accessorial the address earns", () => {
		const result = quote({
			shipment: {
				state: "NC",
				zip: "27401",
				pallets: 2,
				boxes: 96,
				accessorials: ["RESIDENTIAL", "LIFTGATE", "LIMITED_ACCESS"],
			},
		})

		expect(result.quoted).toBe(true)
		if (result.quoted) {
			expect(result.accessorials.map((a) => a.code)).toEqual([
				"RESIDENTIAL",
				"LIFTGATE",
				"LIMITED_ACCESS",
			])
			expect(result.accessorialTotal.toString()).toBe("270")
			expect(result.amount.toString()).toBe("520")
		}
	})

	it("ignores an accessorial the owner has published no rate for", () => {
		const result = quote({
			accessorialRates: [{ code: "LIFTGATE", label: "Liftgate", rate: "110" }],
			shipment: {
				state: "NC",
				zip: "27401",
				pallets: 2,
				boxes: 96,
				accessorials: ["RESIDENTIAL", "LIFTGATE"],
			},
		})

		expect(result.quoted).toBe(true)
		if (result.quoted) expect(result.accessorialTotal.toString()).toBe("110")
	})
})

describe("truckloads", () => {
	it("charges the truckload rate flat once the threshold is reached", () => {
		const result = quote({
			shipment: { state: "NC", zip: "27401", pallets: 8, boxes: 384, accessorials: [] },
		})

		expect(result.quoted).toBe(true)
		if (result.quoted) {
			expect(result.basis).toBe("FTL")
			// Not 8 × 125. Past the threshold you are buying a trailer, not space
			// on one.
			expect(result.linehaul.toString()).toBe("1450")
		}
	})

	it("sends it for a quote when the zone has no truckload rate", () => {
		const result = quote({
			shipment: { state: "NY", zip: "10001", pallets: 9, boxes: 432, accessorials: [] },
		})

		expect(result.quoted).toBe(false)
		if (!result.quoted) {
			expect(result.code).toBe("OVER_FTL")
			expect(result.reason).toContain("9 pallets")
		}
	})

	it("still rates normally just under the threshold", () => {
		const result = quote({
			shipment: { state: "NC", zip: "27401", pallets: 7, boxes: 336, accessorials: [] },
		})

		expect(result.quoted).toBe(true)
		if (result.quoted) {
			expect(result.basis).toBe("PER_PALLET")
			expect(result.linehaul.toString()).toBe("875")
		}
	})
})

describe("what it refuses to guess", () => {
	it("does not rate an order that ships neither boxes nor pallets", () => {
		// Accessories, until the client says how they are packed and sold.
		const result = quote({
			shipment: { state: "NC", zip: "27401", pallets: 0, boxes: 0, accessorials: [] },
		})

		expect(result.quoted).toBe(false)
		if (!result.quoted) expect(result.code).toBe("NO_RATE")
	})

	it("treats a zero rate as no rate rather than as free delivery", () => {
		const free: ZoneRates = {
			id: "free",
			name: "Unpriced",
			states: ["VA"],
			zips: [],
			perPalletRate: "0",
			perBoxRate: "0",
		}
		const result = quote({
			zones: [free],
			shipment: { state: "VA", zip: "23220", pallets: 2, boxes: 96, accessorials: [] },
		})

		expect(result.quoted).toBe(false)
		if (!result.quoted) expect(result.code).toBe("NO_RATE")
	})
})

describe("accessorials come off the address", () => {
	it("reads the three flags a destination carries", () => {
		expect(accessorialCodesOf({ isResidential: true, limitedAccess: true })).toEqual([
			"RESIDENTIAL",
			"LIMITED_ACCESS",
		])
		expect(accessorialCodesOf({})).toEqual([])
	})
})
