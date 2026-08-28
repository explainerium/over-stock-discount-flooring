import { describe, expect, it } from "vitest"
import {
	changesRequestedEmail,
	inviteEmail,
	newLeadEmail,
	orderApprovedEmail,
	orderRejectedEmail,
	orderShippedEmail,
	orderSubmittedEmail,
	passwordResetEmail,
} from "./templates"
import type { OrderSummary } from "./templates"

const ORDER: OrderSummary = {
	orderId: "ord_1",
	orderNumber: 42,
	companyName: "Piedmont Floor Supply",
	lineCount: 3,
	total: "$2,244.30",
	shipTo: "118 Coltrane Street, Charlotte, NC 28208",
}

const ALL = [
	inviteEmail({ companyName: "Piedmont", token: "t", expiresInDays: 7 }),
	passwordResetEmail({ token: "t", expiresInHours: 1 }),
	orderSubmittedEmail({ order: ORDER, submittedBy: "Dana Whitfield" }),
	orderApprovedEmail({ order: ORDER, freight: "$486.50" }),
	changesRequestedEmail({ order: ORDER, reason: "Gold is three weeks out." }),
	orderRejectedEmail({ order: ORDER, reason: "Below our minimum." }),
	orderShippedEmail({ order: ORDER, proNumber: "PRO-9931", carrier: "AAA Cooper" }),
	newLeadEmail({ source: "CONTACT_FORM", name: "Marcus Bell", email: "m@example.com" }),
]

describe("every message", () => {
	it("has a plain-text part as complete as the HTML one", () => {
		// Some mail clients show only this, and spam filters weigh a missing
		// text part against the sender.
		for (const mail of ALL) {
			expect(mail.text.trim().length, mail.subject).toBeGreaterThan(40)
			expect(mail.subject.length).toBeGreaterThan(0)
		}
	})

	it("never says anything is being bought or paid for here", () => {
		// Nothing is charged on this site. An order is a request, the owner
		// approves it, and QuickBooks invoices it — wording that suggests a
		// checkout sets an expectation the system will not meet.
		for (const mail of ALL) {
			const body = `${mail.subject} ${mail.text}`.toLowerCase()
			for (const word of ["checkout", "purchase", "pay now", "add to cart"]) {
				expect(body, `${mail.subject} mentions "${word}"`).not.toContain(word)
			}
		}
	})
})

describe("decisions carry their reason", () => {
	it("puts the owner's words in the message, not just the status", () => {
		// The reason is the entire point of the message. Without it the dealer
		// rings up to ask, which is the call this is meant to remove.
		expect(
			changesRequestedEmail({ order: ORDER, reason: "Gold is three weeks out." }).text,
		).toContain("Gold is three weeks out.")
		expect(orderRejectedEmail({ order: ORDER, reason: "Below our minimum." }).html).toContain(
			"Below our minimum.",
		)
	})

	it("escapes what a person typed", () => {
		// Notes and reasons are written by people and land in an HTML document.
		const mail = changesRequestedEmail({
			order: ORDER,
			reason: `<script>alert("x")</script>`,
		})
		expect(mail.html).not.toContain("<script>")
		expect(mail.html).toContain("&lt;script&gt;")
	})
})

describe("the shipping notice", () => {
	it("carries the tracking details in the text part where they can be copied", () => {
		// This is the message the plan says removes "where's my order?" calls.
		const mail = orderShippedEmail({
			order: ORDER,
			proNumber: "PRO-9931",
			carrier: "AAA Cooper",
		})
		expect(mail.text).toContain("PRO-9931")
		expect(mail.text).toContain("AAA Cooper")
	})

	it("still sends when the carrier gave us nothing but a date", () => {
		const mail = orderShippedEmail({ order: ORDER })
		expect(mail.subject).toContain("shipped")
		expect(mail.text).toContain("on its way")
	})
})

describe("a sample request", () => {
	it("carries the address, because that is what gets written on the package", () => {
		const mail = newLeadEmail({
			source: "SAMPLE_REQUEST",
			name: "Ray Alvarez",
			productName: "Avalon",
			shipTo: "Ray Alvarez\n118 Coltrane Street\nCharlotte, NC 28208",
		})
		expect(mail.text).toContain("118 Coltrane Street")
		expect(mail.html).toContain("118 Coltrane Street")
		expect(mail.text).toContain("Avalon")
	})
})

describe("what the owner is told about an order", () => {
	it("names the company, the size and where it is going", () => {
		const mail = orderSubmittedEmail({ order: ORDER, submittedBy: "Dana Whitfield" })
		expect(mail.subject).toContain("Piedmont Floor Supply")
		expect(mail.text).toContain("$2,244.30")
		expect(mail.text).toContain("Charlotte, NC 28208")
	})

	it("says freight is still open, so approving is a decision and not a rubber stamp", () => {
		expect(orderSubmittedEmail({ order: ORDER, submittedBy: "Dana" }).text).toContain(
			"Freight has not been quoted",
		)
	})

	it("names the rated figure when the zone table found one", () => {
		// He is reading this on a phone in the warehouse. The number being in
		// the message is what lets him notice it is wrong without opening it.
		const mail = orderSubmittedEmail({
			order: ORDER,
			submittedBy: "Dana",
			freight: "$310.00",
		})

		expect(mail.text).toContain("rated at $310.00")
		expect(mail.text).not.toContain("has not been quoted")
	})
})
