import type { NextConfig } from "next"
import { ALL_REDIRECTS } from "./src/constants/redirects"

/**
 * Where product imagery is served from.
 *
 * Every image path in the database is relative — `/swatches/bronze-avalon.jpg`
 * — so today they come from `public/` on the site's own origin and `next/image`
 * needs no permission for them. This is here for the day they move to an
 * S3-compatible bucket, which is a different origin and would be refused
 * without it.
 *
 * Parsed defensively. `??` only substitutes for undefined, so a variable that
 * is *set but empty* — which is what a blank field in a hosting dashboard
 * produces — reaches `new URL("")` and throws at config load, before anything
 * else in the build has a chance to run.
 */
function mediaOrigin(): URL | null {
	const raw = process.env.MEDIA_URL?.trim()
	if (!raw) return null

	try {
		return new URL(raw)
	} catch {
		// A typo here must not take the build down. It costs a remote pattern,
		// and remote images are not in use yet.
		console.warn(`[config] MEDIA_URL is not a URL: "${raw}" — ignoring it.`)
		return null
	}
}

const media = mediaOrigin()

/**
 * Headers live here rather than in a host-specific config file.
 *
 * The site is on Vercel for the build and may move to a VPS after handover.
 * Anything expressed only in `vercel.json` is left behind at that point, so
 * the rules that matter — security headers, and keeping the dealer portal and
 * admin out of the index — are declared in the framework instead.
 */
const securityHeaders = [
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	{ key: "X-Frame-Options", value: "SAMEORIGIN" },
	{ key: "X-DNS-Prefetch-Control", value: "on" },
]

const nextConfig: NextConfig = {
	reactCompiler: true,

	images: {
		// Empty when no media origin is configured, which is the correct answer
		// for relative paths — an empty list is not a missing one.
		remotePatterns: media
			? [
					{
						protocol: media.protocol.replace(":", "") as "http" | "https",
						hostname: media.hostname,
						port: media.port,
						pathname: "/**",
					},
				]
			: [],
	},

	/**
	 * The old site's URLs, kept alive. The map itself is in
	 * src/constants/redirects.ts so the cutover checklist has one file to read.
	 */
	async redirects() {
		return ALL_REDIRECTS
	},

	async headers() {
		return [
			{
				source: "/:path*",
				headers: securityHeaders,
			},
			{
				// Wholesale pricing sits behind these routes. They must never be indexed.
				source: "/(portal|admin)/:path*",
				headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
			},
		]
	},
}

export default nextConfig
