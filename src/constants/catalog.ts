/**
 * Content constants.
 *
 * Product data used to live here as a hardcoded list. It now comes from the
 * database — the catalog is seeded, the owner can edit it in admin, and the
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
	weekdays: "Mon–Fri 8 AM–5 PM",
	saturday: "Sat 8 AM–12 PM",
	sunday: "Sun Closed",
} as const

/** The client's business page, for the footer and the contact page. */
export const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=100023570330002"

/** From the client's own Rigid Core page. */
export const FACTS = {
	checkpoints: 89,
	productionProcesses: 10,
} as const

/**
 * The flooring category's slug. Created by the categories migration, and safe
 * to name in code because a category's slug never changes when the owner
 * renames it — only the name does.
 */
export const FLOORING_CATEGORY = "flooring"
