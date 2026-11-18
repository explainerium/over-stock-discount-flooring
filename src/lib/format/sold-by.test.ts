import { describe, expect, it } from "vitest"
import { formatFeet, formatPieces, piecesOf, soldByLabel } from "./sold-by"

describe("soldByLabel", () => {
	it("calls flooring sold by the box, though it is priced per square foot", () => {
		expect(soldByLabel("SQFT", ["SQFT", "BOX", "PALLET"])).toBe("Box")
	})

	it("calls trim with a piece length sold by the piece, priced per foot", () => {
		expect(soldByLabel("LF", ["STICK", "LF"], "12.0000")).toBe(
			"12 ft piece, priced per linear foot",
		)
	})

	it("ignores a piece length nobody can order by", () => {
		expect(soldByLabel("LF", ["LF"], "12")).toBe("Linear foot")
	})

	it("uses the pricing unit for everything else", () => {
		expect(soldByLabel("EACH", ["EACH"])).toBe("Each")
		expect(soldByLabel("LF", ["LF", "STICK"])).toBe("Linear foot")
		expect(soldByLabel("ROLL", ["ROLL"])).toBe("Roll")
	})
})

describe("pieces", () => {
	it("reads feet without trailing zeros", () => {
		expect(formatFeet("12.0000")).toBe("12 ft")
		expect(formatFeet("7.7083")).toBe("7.7083 ft")
	})

	it("pluralises", () => {
		expect(formatPieces(1)).toBe("1 piece")
		expect(formatPieces(9)).toBe("9 pieces")
	})

	it("counts pieces only on lines that ship by the piece", () => {
		expect(piecesOf({ uomBase: "STICK", qtyBase: "9.00" })).toBe(9)
		expect(piecesOf({ uomBase: "BOX", qtyBase: "51.00" })).toBeNull()
	})
})
