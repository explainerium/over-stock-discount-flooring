/**
 * The order lifecycle.
 *
 * There is no payment anywhere in this system. An order is a request, the owner
 * approves it, and QuickBooks issues the invoice — so what governs an order is
 * not a payment state but who is allowed to move it, and where to.
 *
 * Kept as a table rather than a pile of conditionals because it is the thing a
 * reader will want to check against the client's own description, and because
 * "can a dealer reject their own order" should be answerable by looking rather
 * than by tracing.
 */

export type OrderStatus =
	| "DRAFT"
	| "SUBMITTED"
	| "CHANGES_REQUESTED"
	| "APPROVED"
	| "INVOICED"
	| "SHIPPED"
	| "DELIVERED"
	| "CLOSED"
	| "REJECTED"
	| "CANCELLED"

/** Who is asking. Not a role — the owner and an admin are the same thing here. */
export type Actor = "DEALER" | "STAFF"

export interface Transition {
	from: OrderStatus
	to: OrderStatus
	by: readonly Actor[]
	/** What the button says. */
	label: string
	/**
	 * What the button says to staff, where that differs. Moving an order from
	 * CHANGES_REQUESTED back to SUBMITTED is the dealer resubmitting; when the
	 * owner does it, he is putting an order the dealer agreed to over the phone
	 * back in his own queue so he can price and approve it.
	 */
	staffLabel?: string
	/** Whether the actor should be asked why. */
	note?: "required" | "optional"
}

/**
 * Every legal move.
 *
 * Two things worth noting against the client's brief:
 *
 *   - A dealer can submit and can cancel their own draft, and nothing else.
 *     "Nothing proceeds until approved" means the dealer cannot advance an
 *     order past SUBMITTED by any route.
 *   - REJECTED and CANCELLED are both dead ends but they are not the same
 *     event: rejected is the owner declining, cancelled is the order being
 *     withdrawn. Collapsing them loses the reason, and the reason is exactly
 *     what the dealer rings up to ask about.
 */
export const TRANSITIONS: readonly Transition[] = [
	{
		from: "DRAFT",
		to: "SUBMITTED",
		by: ["DEALER", "STAFF"],
		label: "Submit for approval",
	},
	{
		from: "DRAFT",
		to: "CANCELLED",
		by: ["DEALER", "STAFF"],
		label: "Discard order",
	},

	{
		from: "SUBMITTED",
		to: "APPROVED",
		by: ["STAFF"],
		label: "Approve",
		note: "optional",
	},
	{
		from: "SUBMITTED",
		to: "CHANGES_REQUESTED",
		by: ["STAFF"],
		label: "Request changes",
		note: "required",
	},
	{
		from: "SUBMITTED",
		to: "REJECTED",
		by: ["STAFF"],
		label: "Reject",
		note: "required",
	},
	{
		from: "SUBMITTED",
		to: "CANCELLED",
		by: ["STAFF"],
		label: "Cancel",
		note: "optional",
	},

	{
		from: "CHANGES_REQUESTED",
		to: "SUBMITTED",
		by: ["DEALER", "STAFF"],
		label: "Resubmit",
		staffLabel: "Put back in the queue",
	},
	{
		from: "CHANGES_REQUESTED",
		to: "CANCELLED",
		by: ["DEALER", "STAFF"],
		label: "Cancel",
	},

	{ from: "APPROVED", to: "INVOICED", by: ["STAFF"], label: "Mark invoiced" },
	{
		from: "APPROVED",
		to: "CANCELLED",
		by: ["STAFF"],
		label: "Cancel",
		note: "required",
	},

	{ from: "INVOICED", to: "SHIPPED", by: ["STAFF"], label: "Mark shipped" },
	{
		from: "INVOICED",
		to: "CANCELLED",
		by: ["STAFF"],
		label: "Cancel",
		note: "required",
	},

	{ from: "SHIPPED", to: "DELIVERED", by: ["STAFF"], label: "Mark delivered" },
	{ from: "DELIVERED", to: "CLOSED", by: ["STAFF"], label: "Close" },
]

/** Nothing moves out of these. */
export const TERMINAL: readonly OrderStatus[] = ["CLOSED", "REJECTED", "CANCELLED"]

/** What a dealer may still edit. Anything else is read-only to them. */
export const DEALER_EDITABLE: readonly OrderStatus[] = ["DRAFT", "CHANGES_REQUESTED"]

/**
 * What the owner may edit.
 *
 * SUBMITTED and nothing beyond it — the client asked to be able to change an
 * order before approving, not after it has been invoiced. Editing an invoiced
 * order would put the site and QuickBooks out of step with no way to tell which
 * is right.
 */
export const STAFF_EDITABLE: readonly OrderStatus[] = ["SUBMITTED"]

export interface TransitionCheck {
	ok: boolean
	reason?: string
}

export function canTransition(from: OrderStatus, to: OrderStatus, actor: Actor): TransitionCheck {
	if (from === to) return { ok: false, reason: "That order is already in that state." }

	const move = TRANSITIONS.find((t) => t.from === from && t.to === to)
	if (!move) {
		return TERMINAL.includes(from)
			? {
					ok: false,
					reason: `A ${label(from).toLowerCase()} order cannot be changed.`,
				}
			: {
					ok: false,
					reason: `An order cannot go from ${label(from)} to ${label(to)}.`,
				}
	}

	if (!move.by.includes(actor)) {
		return { ok: false, reason: "That is not yours to do." }
	}

	return { ok: true }
}

/** Everything this actor could do to an order in this state, for building buttons. */
export function transitionsFor(from: OrderStatus, actor: Actor): Transition[] {
	return TRANSITIONS.filter((t) => t.from === from && t.by.includes(actor))
}

export function isEditable(status: OrderStatus, actor: Actor): boolean {
	return actor === "DEALER" ? DEALER_EDITABLE.includes(status) : STAFF_EDITABLE.includes(status)
}

/**
 * Whether an order is fit to submit.
 *
 * Separate from the transition table because these are facts about the order's
 * contents rather than about who is asking.
 *
 * The destination is checked here rather than at approval because this is the
 * cheapest moment to fix it. Freight is quoted on a place — a ZIP the carrier
 * rates on, and whatever that place needs to receive a pallet — so an order
 * without one cannot be priced, and discovering that at approval is a phone
 * call rather than a click.
 */
export function canSubmit(order: {
	lineCount: number
	total: string | number
	hasShipTo: boolean
	/** The dealer's minimum, if they have one. */
	minOrderValue?: string | number | null
}): TransitionCheck {
	if (order.lineCount === 0) {
		return { ok: false, reason: "There is nothing on this order yet." }
	}
	if (Number(order.total) <= 0) {
		return {
			ok: false,
			reason: "This order adds up to nothing — check the quantities.",
		}
	}
	if (!order.hasShipTo) {
		return { ok: false, reason: "Choose where this is going before you send it." }
	}

	// Checked on goods only. Freight is not quoted yet at this point, and a
	// minimum that a dealer clears on delivery charges is not a minimum.
	const minimum = order.minOrderValue == null ? 0 : Number(order.minOrderValue)
	if (minimum > 0 && Number(order.total) < minimum) {
		return {
			ok: false,
			reason: `Orders start at $${minimum.toFixed(2)} of goods on your account.`,
		}
	}

	return { ok: true }
}

const LABELS: Record<OrderStatus, string> = {
	DRAFT: "Draft",
	SUBMITTED: "Awaiting approval",
	CHANGES_REQUESTED: "Changes requested",
	APPROVED: "Approved",
	INVOICED: "Invoiced",
	SHIPPED: "Shipped",
	DELIVERED: "Delivered",
	CLOSED: "Closed",
	REJECTED: "Rejected",
	CANCELLED: "Cancelled",
}

/** How a state is described to a person. "Awaiting approval" beats "Submitted". */
export function label(status: OrderStatus): string {
	return LABELS[status]
}

/** What the dealer should understand is happening now. */
export function dealerExplanation(status: OrderStatus): string {
	switch (status) {
		case "DRAFT":
			return "Still being built. Nothing has been sent to us yet."
		case "SUBMITTED":
			return "With us for approval. We will confirm freight and get back to you."
		case "CHANGES_REQUESTED":
			return "We have asked for a change before this can go ahead."
		case "APPROVED":
			return "Approved. An invoice will follow through QuickBooks."
		case "INVOICED":
			return "Invoiced. Payment is handled through QuickBooks as usual."
		case "SHIPPED":
			return "On its way."
		case "DELIVERED":
			return "Delivered."
		case "CLOSED":
			return "Complete."
		case "REJECTED":
			return "We were not able to take this order."
		case "CANCELLED":
			return "Cancelled."
	}
}
