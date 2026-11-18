import type { NextConfig } from "next"
import { ALL_REDIRECTS } from "./src/constants/redirects"

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

	/**
	 * Product photographs live on Cloudinary, and Cloudinary resizes them: the
	 * loader writes the width and quality into the image URL. Vercel's own
	 * optimiser is never involved, so there is no allow-list of remote hosts to
	 * keep in step and nothing to change if the site moves to a VPS.
	 */
	images: {
		loader: "custom",
		loaderFile: "./src/lib/images/cloudinary-loader.ts",
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
