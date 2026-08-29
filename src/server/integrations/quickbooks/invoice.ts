import Decimal from "decimal.js"
import { formatUnitPrice } from "@/lib/format/money"
import { QboError, type QboInvoice, type QboInvoiceLine, type QboItemRefs } from "./types"

/**
 * An approved order, as an invoice.
 *
 * Pure — no network, no database — so the part of this integration that is
 * easiest to get wrong and most expensive to get wrong can be read and tested
 * without a QuickBooks connection.
 *
 * Two decisions worth knowing before changing anything here.
 *
 * **Amount is authoritative; `Qty` and `UnitPrice` are not sent.** QuickBooks
 * recomputes a line from quantity times price when both are present, and its
 * rounding is not ours — a per-square-foot price carried to four decimals
 * against a coverage figure of 1,205.64 will not always land on the cent this
 * site already showed the dealer. Sending the money and putting the arithmetic
 * in the description keeps the invoice and the portal agreeing to the penny,
 * which is the whole point of doing this in software.
 *
 * **Tax is left to QuickBooks.** The customer record in the client's own file
 * is where his accountant configured what each dealer is charged, and it is
 * already right. Sending a tax figure from here would either double it or
 * silently override an exemption. The order's own tax figure goes in the
 * private note so the two can be reconciled if they ever disagree.
 */

/**
 * "1,205.64" — the coverage figure, exact.
 *
 * Not `formatCoverage`, which truncates to whole square feet for the screen.
 * On an invoice that truncation is a discrepancy: 1,205 sq ft at $2.19 is
 * $2,638.95 and the line says $2,640.35, and the person reconciling it has no
 * way to see why. The screen can round; the paperwork cannot.
 */
function exact(value: string): string {
	return new Decimal(value).toNumber().toLocaleString("en-US", { maximumFractionDigits: 2 })
}

/** What a line looked like on the order. */
export interface InvoiceableLine {
	name: string
	sku: string
	/** In the product's pricing unit — SQFT, LF, EACH, ROLL. */
	pricingUom: string
	unitPrice: string
	amount: string
	/** Flooring only. */
	boxes?: number | null
	sqFt?: string | null
}

export interface InvoiceableOrder {
	orderNumber: number
	/** `YYYY-MM-DD`. QuickBooks wants a date, not a timestamp. */
	txnDate: string
	companyName: string
	qboCustomerId?: string | null
	lines: InvoiceableLine[]
	freight: string
	tax: string
	shipTo?: string | null
}

/**
 * "51 boxes · 1,205.64 sq ft at $2.19/sq ft"
 *
 * The bookkeeper's line. It has to answer "why is this $2,640" without anyone
 * opening the website, which means the box count and the coverage both have to
 * be on it — those are the two numbers a dealer rings up about.
 */
function describe(line: InvoiceableLine): string {
	const parts = [`${line.name} (${line.sku})`]

	const measure: string[] = []
	if (line.boxes) measure.push(`${line.boxes} ${line.boxes === 1 ? "box" : "boxes"}`)
	if (line.sqFt) measure.push(`${exact(line.sqFt)} sq ft`)

	if (measure.length > 0) {
		parts.push(`${measure.join(" · ")} at ${formatUnitPrice(line.unitPrice, line.pricingUom)}`)
	} else {
		parts.push(`at ${formatUnitPrice(line.unitPrice, line.pricingUom)}`)
	}

	return parts.join(" — ")
}

/** A money string as QuickBooks wants it: a number, two decimals, never a string. */
function amount(value: string): number {
	return new Decimal(value).toDecimalPlaces(2).toNumber()
}

export function buildInvoice(order: InvoiceableOrder, items: QboItemRefs): QboInvoice {
	if (!order.qboCustomerId) {
		// Loud, and on purpose. An invoice posted against the wrong customer is
		// worse than one not posted at all, and matching by name is how that
		// happens — the client has dealers with similar names in a file we did
		// not create. The match is made once, by a person, during onboarding.
		throw new QboError(
			`${order.companyName} is not matched to a QuickBooks customer yet.`,
			"NO_CUSTOMER",
		)
	}

	if (!items.goodsItemId) {
		throw new QboError(
			"No QuickBooks item is set for goods, so there is nothing to bill the lines against.",
			"NO_ITEM",
		)
	}

	const lines: QboInvoiceLine[] = order.lines.map((line) => ({
		Amount: amount(line.amount),
		DetailType: "SalesItemLineDetail",
		Description: describe(line),
		SalesItemLineDetail: { ItemRef: { value: items.goodsItemId } },
	}))

	const freight = new Decimal(order.freight || 0)
	if (freight.greaterThan(0)) {
		if (!items.freightItemId) {
			// Rolling freight into the goods line would misstate income against
			// the wrong account, which is a bookkeeping error rather than a
			// display one. Better to stop and be told.
			throw new QboError(
				"This order has freight on it, but no QuickBooks item is set for freight.",
				"NO_ITEM",
			)
		}
		lines.push({
			Amount: amount(freight.toString()),
			DetailType: "SalesItemLineDetail",
			Description: "Freight",
			SalesItemLineDetail: { ItemRef: { value: items.freightItemId } },
		})
	}

	if (lines.length === 0) {
		throw new QboError("There is nothing on this order to invoice.", "NOTHING_TO_INVOICE")
	}

	const memo = [`Order #${order.orderNumber}`, order.shipTo ? `Ship to ${order.shipTo}` : null]
		.filter(Boolean)
		.join(". ")

	return {
		CustomerRef: { value: order.qboCustomerId },
		Line: lines,
		// The same number both places. A dealer ringing about "order 1042" and a
		// bookkeeper looking at invoice 1042 should be looking at one thing.
		DocNumber: String(order.orderNumber),
		TxnDate: order.txnDate,
		CustomerMemo: { value: memo },
		// What this site thinks the tax is, recorded rather than sent. If
		// QuickBooks computes something different from the customer record, this
		// is the line that makes the difference findable.
		PrivateNote: `Raised from the dealer portal. Tax on the portal order: ${order.tax}.`,
	}
}
