import { describe, expect, it } from "vitest"
import { priceInquirySchema } from "./leads"

const inquiry = {
	productId: "p1",
	customerType: "CONTRACTOR",
	name: "Pat Jones",
	phone: "336 555 0100",
	email: "pat@example.com",
	sqFt: "1,200",
	zip: "27260",
}

const fields = (input: object) =>
	priceInquirySchema.safeParse(input).error?.issues.map((i) => i.path.join(".")) ?? []

describe("pricing inquiry", () => {
	it("takes the client's fields, square feet with a comma included", () => {
		expect(priceInquirySchema.safeParse(inquiry).success).toBe(true)
	})

	it("needs to know who is asking", () => {
		expect(fields({ ...inquiry, customerType: undefined })).toEqual(["customerType"])
		expect(fields({ ...inquiry, customerType: "WHOLESALER" })).toEqual(["customerType"])
	})

	it("needs a phone number, an email and a real ZIP code", () => {
		expect(fields({ ...inquiry, phone: "" })).toEqual(["phone"])
		expect(fields({ ...inquiry, email: "pat" })).toEqual(["email"])
		expect(fields({ ...inquiry, zip: "2726" })).toEqual(["zip"])
		expect(priceInquirySchema.safeParse({ ...inquiry, zip: "27260-1234" }).success).toBe(true)
	})

	it("leaves the amount optional, but refuses words where square feet go", () => {
		expect(priceInquirySchema.safeParse({ ...inquiry, sqFt: "" }).success).toBe(true)
		expect(fields({ ...inquiry, sqFt: "a lot" })).toEqual(["sqFt"])
	})
})
