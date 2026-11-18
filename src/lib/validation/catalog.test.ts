import { describe, expect, it } from "vitest"
import {
	createProductSchema,
	createSeriesSchema,
	NO_SERIES,
	updateProductFormSchema,
} from "./catalog"

const product = {
	name: "Primed White Quarter Round",
	sku: "WM106",
	categoryId: "cat_trim_moldings",
	seriesId: NO_SERIES,
	designName: "",
	description: "",
	listPrice: "0.41",
	pricingUom: "LF" as const,
	orderUoms: ["STICK", "LF"] as ("STICK" | "LF")[],
	lfPerPiece: "12",
	stockStatus: "IN_STOCK" as const,
	isPublic: true,
	isActive: true,
	dealerRestricted: false,
	dealerIds: [],
	images: "",
}

const issue = (result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
	result.error?.issues.map((i) => i.path.join("."))

describe("piece length", () => {
	it("accepts trim priced per foot and ordered by the piece", () => {
		expect(updateProductFormSchema.safeParse(product).success).toBe(true)
	})

	it("refuses ordering by the piece without a length", () => {
		const result = updateProductFormSchema.safeParse({ ...product, lfPerPiece: "" })
		expect(issue(result)).toEqual(["lfPerPiece"])
	})

	it("refuses a zero length", () => {
		const result = updateProductFormSchema.safeParse({ ...product, lfPerPiece: "0.00" })
		expect(issue(result)).toEqual(["lfPerPiece"])
	})

	it("refuses a length on something not priced per foot", () => {
		const result = updateProductFormSchema.safeParse({
			...product,
			pricingUom: "EACH",
			orderUoms: ["EACH"],
		})
		expect(issue(result)).toEqual(["lfPerPiece"])
	})

	it("leaves trim sold by the cut foot alone", () => {
		const result = updateProductFormSchema.safeParse({
			...product,
			orderUoms: ["LF"],
			lfPerPiece: "",
		})
		expect(result.success).toBe(true)
	})

	it("asks a new piece product for its length, but not flooring", () => {
		const base = { name: "1x4 Board", sku: "S4S-1X4-12", categoryId: "c", soldBy: "PIECE" }
		expect(issue(createProductSchema.safeParse({ ...base, seriesId: NO_SERIES }))).toEqual([
			"lfPerPiece",
		])
		expect(
			createProductSchema.safeParse({ ...base, seriesId: NO_SERIES, lfPerPiece: "12" })
				.success,
		).toBe(true)
		expect(createProductSchema.safeParse({ ...base, seriesId: "series_ar" }).success).toBe(true)
	})
})

describe("new series", () => {
	it("needs a name, and trims it", () => {
		expect(createSeriesSchema.safeParse({ name: "   " }).success).toBe(false)
		expect(createSeriesSchema.parse({ name: "  BB - Builder Grade " }).name).toBe(
			"BB - Builder Grade",
		)
	})
})
