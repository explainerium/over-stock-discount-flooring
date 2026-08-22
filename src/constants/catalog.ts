/**
 * Content constants.
 *
 * Product data used to live here as a hardcoded list. It now comes from the
 * database — the catalogue is seeded, the owner can edit it in admin, and the
 * public site reads what he publishes. What is left in this file is the handful
 * of facts that are copy rather than data: the showroom details, and the
 * production figures that appear in a sentence on the home page.
 */

export const SHOWROOM = {
	street: "908 Old Thomasville Rd",
	city: "High Point",
	state: "NC",
	zip: "27260",
	phone: "(843) 318-9675",
	phoneHref: "tel:8433189675",
	weekdays: "Mon–Fri 8:00–5:00",
	saturday: "Sat 8:00–12:00",
} as const

/** From the client's own Rigid Core page. */
export const FACTS = {
	checkpoints: 89,
	productionProcesses: 10,
} as const

/**
 * A series' plain-English claim.
 *
 * Deliberately not in the database: these are marketing lines, and on the
 * published specs Bronze and Silver are identical on thickness and wear layer.
 * Until the client says what actually separates them, each line here is
 * something verifiably true rather than an invented differentiator.
 */
export const SERIES_CLAIM: Record<string, string> = {
	bronze: "The widest plank we stock, and the most floor in a box.",
	silver: "Wood-embossed rather than random — a quieter, more even floor.",
	gold: "A 20 mil wear layer — rated for commercial floors, not just homes.",
	"silver-w": "A wider plank on a slimmer core, packed 60 boxes to the pallet.",
	"gold-w": "The Gold surface in the wider 7.17 inch plank.",
	accessories: "Baseboard and quarter round, priced by the linear foot.",
}
