import type { ZoneRates } from "./types"

/**
 * Which zone a destination falls in.
 *
 * ZIP before state, and a longer ZIP entry before a shorter one. Carriers rate
 * on the ZIP, and the exceptions have to work the way the owner expects them
 * to: "27" covers central North Carolina, "27260" covers High Point alone, and
 * putting High Point in a local-delivery zone must not be undone by the
 * statewide row that also matches it.
 *
 * Longest-prefix rather than first-match for the same reason. A zone table is
 * edited over years by someone who will not remember what order the rows are
 * in, and "the more specific rule wins" is the only rule that stays true when
 * he adds one.
 */
export function findZone(
	zones: readonly ZoneRates[],
	destination: { state: string; zip: string },
): ZoneRates | null {
	// A ZIP+4 is truncated to five. The last four digits are a delivery walk,
	// not a rating unit, and no zone table will ever be written in them.
	const zip = destination.zip.trim().slice(0, 5)
	const state = destination.state.trim().toUpperCase()

	let best: ZoneRates | null = null
	let matched = 0

	for (const zone of zones) {
		for (const entry of zone.zips) {
			const prefix = entry.trim()
			// An empty entry would match every destination on the map. It is the
			// shape a blank row in the admin table takes, so it is skipped rather
			// than trusted.
			if (!prefix || !zip.startsWith(prefix)) continue
			if (prefix.length > matched) {
				best = zone
				matched = prefix.length
			}
		}
	}
	if (best) return best

	return zones.find((zone) => zone.states.some((s) => s.trim().toUpperCase() === state)) ?? null
}
