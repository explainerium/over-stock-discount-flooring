import type { MetadataRoute } from "next"
import { SITE_URL } from "@/constants/site"

/**
 * The current site returns 404 for robots.txt. So does its sitemap.
 *
 * The portal and admin are disallowed here as well as carrying noindex headers
 * — belt and braces, because wholesale pricing sitting behind those routes is
 * the one thing on this site that must never be crawled.
 */
export default function robots(): MetadataRoute.Robots {
	const base = SITE_URL

	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
				disallow: ["/admin", "/portal", "/api/", "/login", "/invite/", "/reset-password/"],
			},
		],
		sitemap: `${base}/sitemap.xml`,
	}
}
