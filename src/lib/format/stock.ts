/**
 * Stock status, as a dealer reads it.
 *
 * Shared rather than restated per screen, because the catalogue and the order
 * have to agree: a colour badged "Special order" on one page and "Out" on the
 * next is a dealer ringing up to ask which is true.
 */

const LABEL: Record<string, string> = {
	IN_STOCK: "In stock",
	LOW: "Low stock",
	OUT: "Out of stock",
	SPECIAL_ORDER: "Special order",
}

export function stockLabel(status: string): string {
	return LABEL[status] ?? status
}

/** Whether it is worth saying anything at all. Most lines are simply in stock. */
export function isStockNotable(status: string): boolean {
	return status !== "IN_STOCK"
}

/**
 * What a dealer should understand before they send the order.
 *
 * Deliberately not a blocker. Special order is a real thing to order, and being
 * out today does not mean out next week — the owner confirms a date when he
 * approves. Refusing the order would just move the conversation to the phone,
 * which is the thing this system exists to avoid.
 */
export function stockWarning(statuses: string[]): string | null {
	const out = statuses.filter((status) => status === "OUT").length
	const special = statuses.filter((status) => status === "SPECIAL_ORDER").length
	const low = statuses.filter((status) => status === "LOW").length

	const parts: string[] = []
	if (out > 0) parts.push(`${out} ${out === 1 ? "line is" : "lines are"} out of stock`)
	if (special > 0) parts.push(`${special} ${special === 1 ? "is a" : "are"} special order`)
	if (out === 0 && special === 0 && low > 0) {
		parts.push(`${low} ${low === 1 ? "line is" : "lines are"} running low`)
	}

	if (parts.length === 0) return null

	return `${parts.join(" and ")}. We will confirm a date when we approve the order.`
}
