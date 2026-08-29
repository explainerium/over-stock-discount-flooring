import { describe, expect, it } from "vitest"
import { buildInvoice, type InvoiceableOrder } from "./invoice"
import { QboError } from "./types"

const ITEMS = { goodsItemId: "12", freightItemId: "13" }

const ORDER: InvoiceableOrder = {
	orderNumber: 1042,
	txnDate: "2026-08-29",
	companyName: "Piedmont Floor Supply",
	qboCustomerId: "58",
	lines: [
		{
			name: "Avalon",
			sku: "BRZ-AVALON",
			pricingUom: "SQFT",
			unitPrice: "2.1900",
			amount: "2640.35",
			boxes: 51,
			sqFt: "1205.64",
		},
	],
	freight: "310.00",
	tax: "$0.00",
	shipTo: "1420 Trinity Ave, Charlotte, NC 28208",
}

describe("what goes on the invoice", () => {
	it("bills the money the portal already showed, not a recomputed figure", () => {
		// 1205.64 × 2.19 does not land on 2640.35 the way QuickBooks would round
		// it. The order's own line total is the number the dealer agreed to.
		const invoice = buildInvoice(ORDER, ITEMS)

		expect(invoice.Line[0].Amount).toBe(2640.35)
		expect(invoice.Line[0].SalesItemLineDetail).not.toHaveProperty("Qty")
		expect(invoice.Line[0].SalesItemLineDetail).not.toHaveProperty("UnitPrice")
	})

	it("spells the arithmetic out in the description instead", () => {
		const [line] = buildInvoice(ORDER, ITEMS).Line

		expect(line.Description).toContain("Avalon (BRZ-AVALON)")
		expect(line.Description).toContain("51 boxes")
		expect(line.Description).toContain("1,205.64 sq ft")
		// Two decimals, because 2.1900 is 2.19 — formatUnitPrice only spends the
		// extra digits on a price that genuinely has them. 1,205.64 × 2.19 is
		// 2,640.35, so the description reconciles against the amount.
		expect(line.Description).toContain("$2.19 / sq ft")
	})

	it("keeps the coverage exact rather than truncating it the way the screen does", () => {
		// "1,205 sq ft at $2.19" would not reconcile against $2,640.35, and the
		// person checking it would have no way to see why.
		expect(buildInvoice(ORDER, ITEMS).Line[0].Description).not.toContain("1,205 sq ft")
	})

	it("puts freight on its own line", () => {
		const invoice = buildInvoice(ORDER, ITEMS)

		expect(invoice.Line).toHaveLength(2)
		expect(invoice.Line[1].Description).toBe("Freight")
		expect(invoice.Line[1].Amount).toBe(310)
		expect(invoice.Line[1].SalesItemLineDetail.ItemRef.value).toBe("13")
	})

	it("leaves freight off when there is none", () => {
		const invoice = buildInvoice({ ...ORDER, freight: "0" }, ITEMS)

		expect(invoice.Line).toHaveLength(1)
	})

	it("carries the order number across so both systems call it the same thing", () => {
		const invoice = buildInvoice(ORDER, ITEMS)

		expect(invoice.DocNumber).toBe("1042")
		expect(invoice.CustomerMemo?.value).toContain("Order #1042")
		expect(invoice.CustomerMemo?.value).toContain("Charlotte, NC 28208")
	})

	it("sends no tax, and records what the portal thought it was", () => {
		// The customer record in the client's own file is where the tax rules
		// live. Sending a figure from here would double it or override an
		// exemption.
		const invoice = buildInvoice(ORDER, ITEMS)

		expect(invoice).not.toHaveProperty("TxnTaxDetail")
		expect(invoice.PrivateNote).toContain("$0.00")
	})

	it("describes a product that does not ship in boxes without inventing one", () => {
		const [line] = buildInvoice(
			{
				...ORDER,
				freight: "0",
				lines: [
					{
						name: "Quarter Round",
						sku: "QR-1116",
						pricingUom: "LF",
						unitPrice: "1.80",
						amount: "144.00",
					},
				],
			},
			ITEMS,
		).Line

		expect(line.Description).toBe("Quarter Round (QR-1116) — at $1.80 / linear ft")
	})
})

describe("what it refuses to send", () => {
	it("will not guess at a customer", () => {
		// Matching by name against a file we did not create is how an invoice
		// lands on the wrong company.
		expect(() => buildInvoice({ ...ORDER, qboCustomerId: null }, ITEMS)).toThrowError(QboError)

		try {
			buildInvoice({ ...ORDER, qboCustomerId: null }, ITEMS)
		} catch (error) {
			expect((error as QboError).code).toBe("NO_CUSTOMER")
			expect((error as QboError).message).toContain("Piedmont Floor Supply")
		}
	})

	it("will not bill goods against no item", () => {
		try {
			buildInvoice(ORDER, { goodsItemId: "" })
		} catch (error) {
			expect((error as QboError).code).toBe("NO_ITEM")
		}
	})

	it("will not fold freight into the goods line to get around a missing item", () => {
		// That would put the money against the wrong account — a bookkeeping
		// error rather than a display one.
		try {
			buildInvoice(ORDER, { goodsItemId: "12", freightItemId: null })
			throw new Error("should have refused")
		} catch (error) {
			expect((error as QboError).code).toBe("NO_ITEM")
		}
	})

	it("will not send an empty invoice", () => {
		try {
			buildInvoice({ ...ORDER, lines: [], freight: "0" }, ITEMS)
			throw new Error("should have refused")
		} catch (error) {
			expect((error as QboError).code).toBe("NOTHING_TO_INVOICE")
		}
	})
})
