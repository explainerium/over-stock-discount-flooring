/**
 * Payment terms, as a person writes them.
 *
 * `NET_30` is a database value. Printing it on a screen the owner reads all day
 * is the same mistake as printing a status enum: it is shouting, and it is not
 * how anybody in the trade writes it on an invoice.
 */
const TERMS: Record<string, string> = {
	PREPAY: "Prepay",
	COD: "COD",
	NET_15: "Net 15",
	NET_30: "Net 30",
	NET_60: "Net 60",
}

export function formatTerms(terms: string): string {
	return TERMS[terms] ?? terms.replace(/_/g, " ")
}
