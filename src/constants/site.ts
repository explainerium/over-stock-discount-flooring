/**
 * Where this site lives.
 *
 * Dependency-free on purpose, like `constants/auth.ts`, so anything can import
 * it — including code that runs on the Edge and must not drag Prisma in.
 *
 * Read through one function rather than inline in seven places, because the
 * inline version was `process.env.SITE_URL ?? "http://localhost:3000"`
 * and `??` only substitutes for undefined. A variable that is *set but empty* —
 * exactly what a blank field in a hosting dashboard produces — passes straight
 * through: `new URL("")` throws and takes the build down, and everywhere else
 * every absolute link silently becomes a relative one. An emailed invite with a
 * relative link goes nowhere.
 */

const FALLBACK = "http://localhost:3000"

/** Empty and whitespace both mean "not set". A blank dashboard field is not a value. */
function present(value: string | undefined): string | null {
	const trimmed = value?.trim()
	return trimmed ? trimmed : null
}

/**
 * The candidates, in the order they should win.
 *
 * There is a chicken-and-egg problem on a first deploy: the host's URL does not
 * exist until something has been deployed to it, so it cannot be typed into the
 * settings beforehand. Vercel solves it by injecting the URL itself, and these
 * fall back onto that — a first deploy comes up with correct absolute links and
 * no second pass.
 *
 *   SITE_URL            set by hand; wins, and is how a custom
 *                                   domain takes over later
 *   VERCEL_PROJECT_PRODUCTION_URL   the project's stable production domain
 *   VERCEL_URL                      this one deployment — right for a preview,
 *                                   wrong for production, since it changes on
 *                                   every push and would churn canonical URLs
 *
 * The Vercel variables carry no protocol, so one is added. They are only ever
 * https.
 */
function candidates(): string[] {
	const explicit = present(process.env.SITE_URL)
	const production = present(process.env.VERCEL_PROJECT_PRODUCTION_URL)
	const deployment = present(process.env.VERCEL_URL)

	return [
		explicit,
		production ? `https://${production}` : null,
		deployment ? `https://${deployment}` : null,
	].filter((value): value is string => value !== null)
}

function resolve(): string {
	for (const candidate of candidates()) {
		try {
			// Normalised so `https://x.com` and `https://x.com/` cannot produce
			// `https://x.com//products`.
			return new URL(candidate).origin
		} catch {
			console.warn(`[config] "${candidate}" is not a URL — trying the next source.`)
		}
	}

	return FALLBACK
}

/** The origin, with no trailing slash. */
export const SITE_URL = resolve()

/** An absolute URL for a path. `siteUrl("/products")` → `https://…/products`. */
export function siteUrl(path = ""): string {
	return `${SITE_URL}${path}`
}
