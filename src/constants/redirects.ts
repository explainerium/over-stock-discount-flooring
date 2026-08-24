/**
 * The old site, mapped onto the new one.
 *
 * Every URL the current site serves is listed here, verified page by page
 * against the live site rather than guessed from a sitemap — the audit missed
 * three of them, including the two W-series pages and the Rigid Core page,
 * which is orphaned in the navigation but still indexed.
 *
 * These are permanent (308) rather than temporary. The point is to hand the
 * ranking of the old URL to the new one, and a 307 tells a search engine to
 * keep the old one.
 *
 * Kept in `src/` rather than inline in next.config.ts so the cutover checklist
 * has one file to read, and so it can be tested.
 */

export interface Redirect {
	source: string
	destination: string
	permanent: true
}

/**
 * The ten live pages.
 *
 * The W-series pages are commented out of the client's navigation but still
 * respond, so they still hold links and rankings. They point at the standard
 * series until the client answers whether the W formats are current — sending
 * them to a 404 would throw away whatever equity they hold, and sending them
 * to a page that says "discontinued" would be a claim we cannot make yet.
 */
export const PAGE_REDIRECTS: Redirect[] = [
	{ source: "/index.htm", destination: "/", permanent: true },
	{ source: "/prod_bronze.htm", destination: "/products?series=bronze", permanent: true },
	{ source: "/prod_silver_a.htm", destination: "/products?series=silver", permanent: true },
	{ source: "/prod_silver_w.htm", destination: "/products?series=silver", permanent: true },
	{ source: "/prod_gold_a.htm", destination: "/products?series=gold", permanent: true },
	{ source: "/prod_gold_w.htm", destination: "/products?series=gold", permanent: true },
	{
		source: "/prod_accessories.htm",
		destination: "/products?series=accessories",
		permanent: true,
	},
	{ source: "/aboutus.htm", destination: "/about", permanent: true },
	{ source: "/contactus.htm", destination: "/contact", permanent: true },
	{ source: "/rigidcore.htm", destination: "/rigid-core", permanent: true },
]

/**
 * The PDFs: ten URLs, two documents.
 *
 * The current site serves a warranty and an installation guide from each of
 * five series folders under `/upload/prod/{series}/`. Downloading all ten and
 * checksumming them shows only two distinct files — the same pair copied five
 * times. So the site keeps two, and all ten old URLs point at them.
 *
 * Listed per series rather than as one wildcard because the mapping is a fact
 * about the client's content, not a pattern: the day he publishes a genuinely
 * different Gold warranty, that row changes and the other four do not.
 *
 * Note the space in "Installation Instruction.pdf". Next matches the path as it
 * arrives on the wire, not decoded, so the pattern has to carry the %20 — a
 * literal space here silently matches nothing and the old link 404s.
 */
const LEGACY_SERIES_PATHS = ["bronze", "silver-a", "silver-w", "gold-a", "gold-w"]

export const PDF_REDIRECTS: Redirect[] = LEGACY_SERIES_PATHS.flatMap((series) => [
	{
		source: `/upload/prod/${series}/Warranty.pdf`,
		destination: "/documents/warranty.pdf",
		permanent: true as const,
	},
	{
		source: `/upload/prod/${series}/Installation%20Instruction.pdf`,
		destination: "/documents/installation-instructions.pdf",
		permanent: true as const,
	},
])

/**
 * Everything, for next.config.ts.
 *
 * Trailing-slash and case variants are not enumerated. Next matches the path
 * as given; the old platform served these exact lowercase paths, and adding
 * speculative variants would make this list harder to check against the audit
 * than it is to maintain.
 */
export const ALL_REDIRECTS: Redirect[] = [...PAGE_REDIRECTS, ...PDF_REDIRECTS]
