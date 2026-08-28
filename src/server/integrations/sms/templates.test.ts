import { describe, expect, it } from "vitest"
import { newLeadSms, newOrderSms } from "./templates"

const ORDER = {
	orderId: "ord_1a2b3c",
	orderNumber: 1042,
	companyName: "Piedmont Floor Supply",
	lineCount: 6,
	total: "$2,244.30",
}

describe("the text about a new order", () => {
	it("says enough that he does not have to open it to know", () => {
		// The whole value of the alert. "You have a new order" makes him walk to
		// a screen, which is the cost it was supposed to remove.
		const { text } = newOrderSms(ORDER)

		expect(text).toContain("#1042")
		expect(text).toContain("Piedmont Floor Supply")
		expect(text).toContain("6 lines")
		expect(text).toContain("$2,244.30")
	})

	it("links to the order, not the queue", () => {
		expect(newOrderSms(ORDER).text).toContain("/admin/orders/ord_1a2b3c")
	})

	it("counts one line as a line", () => {
		expect(newOrderSms({ ...ORDER, lineCount: 1 }).text).toContain("1 line,")
	})
})

describe("the text about a new lead", () => {
	it("names the kind and who it was from", () => {
		const { text } = newLeadSms({
			source: "COVERAGE_CALCULATOR",
			name: "Dana Whitfield",
			phone: "(843) 555-0134",
		})

		expect(text).toContain("Coverage calculator")
		expect(text).toContain("Dana Whitfield")
		expect(text).toContain("(843) 555-0134")
	})

	it("prefers the company to the person, the way the inbox does", () => {
		const { text } = newLeadSms({
			source: "DEALER_APPLICATION",
			name: "Dana Whitfield",
			company: "Piedmont Floor Supply",
		})

		expect(text).toContain("Piedmont Floor Supply")
		expect(text).not.toContain("Dana Whitfield")
	})

	it("still says something useful when nobody left a name", () => {
		const { text } = newLeadSms({ source: "CONTACT_FORM" })

		expect(text).toContain("Contact form")
		expect(text).toContain("Someone")
	})

	it("does not invent a label for a source it does not know", () => {
		expect(newLeadSms({ source: "SOMETHING_NEW" }).text).toContain("Enquiry")
	})
})
