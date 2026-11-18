import type { MetadataRoute } from "next"
import { db } from "@/server/db/client"
import { publishedProducts } from "@/server/repositories/catalog"
import { SITE_URL } from "@/constants/site"

/**
 * Every public URL, including one per colour.
 *
 * The point of the product pages is that thirty-four colours stop sharing three
 * URLs; the point of this file is that a crawler is told about all of them
 * rather than having to find them. The current site has neither.
 */
/**
 * Rendered per request, not at build.
 *
 * Same call as the product pages: a sitemap generated at build time would be
 * stale the moment the owner publishes a colour, and it would make every deploy
 * depend on the database being reachable. Crawlers fetch this a handful of
 * times a day, so building it on demand costs nothing worth measuring.
 */
export const dynamic = "force-dynamic"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const base = SITE_URL

	const [products, categories, series] = await Promise.all([
		db.product.findMany({
			where: publishedProducts(),
			select: { slug: true, updatedAt: true },
		}),
		db.category.findMany({
			where: { isActive: true, products: { some: publishedProducts() } },
			select: { slug: true, updatedAt: true },
		}),
		db.series.findMany({
			where: {
				isActive: true,
				sqFtPerBox: { not: null },
				products: { some: publishedProducts() },
			},
			select: { slug: true, updatedAt: true },
		}),
	])

	const staticPages: MetadataRoute.Sitemap = [
		{ url: `${base}/`, changeFrequency: "weekly", priority: 1 },
		{ url: `${base}/products`, changeFrequency: "weekly", priority: 0.9 },
		{ url: `${base}/rigid-core`, changeFrequency: "yearly", priority: 0.7 },
		{ url: `${base}/resources`, changeFrequency: "monthly", priority: 0.6 },
		{ url: `${base}/about`, changeFrequency: "yearly", priority: 0.6 },
		{ url: `${base}/contact`, changeFrequency: "yearly", priority: 0.6 },
		{ url: `${base}/become-a-dealer`, changeFrequency: "yearly", priority: 0.7 },
	]

	return [
		...staticPages,
		...categories.map((c) => ({
			url: `${base}/products?category=${c.slug}`,
			lastModified: c.updatedAt,
			changeFrequency: "weekly" as const,
			priority: 0.7,
		})),
		...series.map((s) => ({
			url: `${base}/products?series=${s.slug}`,
			lastModified: s.updatedAt,
			changeFrequency: "weekly" as const,
			priority: 0.7,
		})),
		...products.map((p) => ({
			url: `${base}/products/${p.slug}`,
			lastModified: p.updatedAt,
			changeFrequency: "monthly" as const,
			priority: 0.8,
		})),
	]
}
