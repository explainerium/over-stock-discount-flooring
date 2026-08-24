/**
 * Whether a typed figure differs from the stored one.
 *
 * Comparing the strings is wrong here. A numeric column gives back "850" for a
 * typed "850.00", so a string comparison stays unequal forever and the row goes
 * on offering to save a change that was saved already.
 *
 * Anything that is not a number falls back to a string comparison, so a typo
 * still counts as a change and the field can be submitted and rejected with a
 * message rather than silently doing nothing.
 */
export function differs(typed: string, stored: string): boolean {
	const a = Number(typed)
	const b = Number(stored)
	if (Number.isNaN(a) || Number.isNaN(b) || typed.trim() === "") {
		return typed.trim() !== stored.trim()
	}
	return a !== b
}
