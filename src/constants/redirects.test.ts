import { describe, expect, it } from "vitest"
import { ALL_REDIRECTS, PAGE_REDIRECTS } from "./redirects"

/**
 * The audit's own list of what the current site serves. If a page is added
 * here and no redirect covers it, that URL 404s on the day of cutover and
 * whatever ranking it held is gone.
 */
const LIVE_PAGES = [
	"/index.htm",
	"/prod_bronze.htm",
	"/prod_silver_a.htm",
	"/prod_silver_w.htm",
	"/prod_gold_a.htm",
	"/prod_gold_w.htm",
	"/prod_accessories.htm",
	"/aboutus.htm",
	"/contactus.htm",
	"/rigidcore.htm",
]

describe("the cutover map", () => {
	it.each(LIVE_PAGES)("covers %s", (page) => {
		expect(PAGE_REDIRECTS.some((r) => r.source === page)).toBe(true)
	})

	it("covers both documents from all five series folders", () => {
		// Ten URLs, two files. Missing one leaves a dead link on somebody's
		// spec sheet.
		for (const series of ["bronze", "silver-a", "silver-w", "gold-a", "gold-w"]) {
			expect(
				ALL_REDIRECTS.some((r) => r.source === `/upload/prod/${series}/Warranty.pdf`),
			).toBe(true)
			expect(
				ALL_REDIRECTS.some(
					(r) => r.source === `/upload/prod/${series}/Installation%20Instruction.pdf`,
				),
			).toBe(true)
		}
	})

	it("encodes the space rather than writing it literally", () => {
		// Next matches the path as it arrives, not decoded. A literal space
		// matches nothing and fails silently.
		expect(ALL_REDIRECTS.every((r) => !r.source.includes(" "))).toBe(true)
	})

	it("is permanent throughout", () => {
		// A 307 tells a search engine to keep the old URL, which is the opposite
		// of what a migration is for.
		expect(ALL_REDIRECTS.every((r) => r.permanent)).toBe(true)
	})

	it("never redirects a path to itself", () => {
		expect(ALL_REDIRECTS.every((r) => r.source !== r.destination)).toBe(true)
	})

	it("has no duplicate sources", () => {
		const sources = ALL_REDIRECTS.map((r) => r.source)
		expect(new Set(sources).size).toBe(sources.length)
	})
})
