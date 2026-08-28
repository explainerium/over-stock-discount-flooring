/**
 * How long something has been sitting.
 *
 * A queue sorted oldest-first tells the owner which order to open. It does not
 * tell him whether that order has been waiting an hour or a fortnight, and that
 * is the part that decides whether he deals with it now.
 *
 * Deliberately coarse. "Waiting 3 days" is actionable; "waiting 3 days, 4 hours
 * and 12 minutes" is the same information dressed up as precision, and it
 * changes on every render.
 */
export function waitingFor(since: Date, now: Date = new Date()): string {
	const minutes = Math.floor((now.getTime() - since.getTime()) / 60_000)

	if (minutes < 1) return "just now"
	if (minutes < 60) return `${minutes} min`

	const hours = Math.floor(minutes / 60)
	if (hours < 24) return hours === 1 ? "1 hour" : `${hours} hours`

	const days = Math.floor(hours / 24)
	if (days < 7) return days === 1 ? "1 day" : `${days} days`

	const weeks = Math.floor(days / 7)
	if (weeks < 5) return weeks === 1 ? "1 week" : `${weeks} weeks`

	const months = Math.floor(days / 30)
	return months === 1 ? "1 month" : `${months} months`
}

/**
 * Whether something has been waiting long enough to be embarrassing.
 *
 * Two working days is the threshold the plan sets for client feedback, and it
 * is a fair one to hold ourselves to: a dealer who submitted an order on Monday
 * and has heard nothing by Wednesday rings up.
 */
export function isOverdue(since: Date, now: Date = new Date()): boolean {
	return now.getTime() - since.getTime() > 2 * 24 * 60 * 60 * 1000
}

/**
 * The same duration, phrased as a point in the past.
 *
 * Exists because "just now" is the one value `waitingFor` returns that is
 * already a complete phrase. Appending "ago" to it by hand at the call site
 * gives "just now ago", which shipped on the admin lead list and again on the
 * dealer overview before anyone hit a lead less than a minute old.
 */
export function agoLabel(since: Date, now: Date = new Date()): string {
	const elapsed = waitingFor(since, now)
	return elapsed === "just now" ? elapsed : `${elapsed} ago`
}
