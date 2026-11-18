import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { SwatchGrid } from "../_components/SwatchGrid"
import { Breadcrumbs } from "../_components/Breadcrumbs"
import { CatalogControls } from "./_components/CatalogControls"
import { FilterLinks } from "./_components/FilterLinks"
import { FLOORING_CATEGORY } from "@/constants/catalog"
import {
	countPublicColours,
	countPublicProducts,
	listPublicCategories,
	listPublicProducts,
	listSpecFacets,
	listPublicSeries,
} from "@/server/repositories/catalog"

type Params = {
	category?: string
	series?: string
	q?: string
	wear?: string
	thickness?: string
	sort?: string
}

export async function generateMetadata({
	searchParams,
}: {
	searchParams: Promise<Params>
}): Promise<Metadata> {
	const { category: categorySlug, series: seriesSlug } = await searchParams
	const [categories, allSeries] = await Promise.all([listPublicCategories(), listPublicSeries()])
	const category = categories.find((c) => c.slug === categorySlug)
	const series = allSeries.find((s) => s.slug === seriesSlug)

	return {
		title: series?.name ?? category?.name ?? "Flooring & Accessories Catalog",
		description:
			category?.blurb ??
			"Rigid core luxury vinyl flooring, trim, stair products and more, in stock in High Point, North Carolina. By the box or the pallet.",
		alternates: {
			canonical: series
				? `/products?series=${series.slug}`
				: category
					? `/products?category=${category.slug}`
					: "/products",
		},
	}
}

/** "a", "a and b", "a, b and c". */
function listOf(words: string[]): string {
	if (words.length <= 1) return words.join("")
	return `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Params> }) {
	const {
		category: categorySlug,
		series: seriesSlug,
		q,
		wear,
		thickness,
		sort,
	} = await searchParams

	const [categories, total, colours] = await Promise.all([
		listPublicCategories(),
		countPublicProducts(),
		countPublicColours(),
	])

	// An unknown category or series in the query string is a 404 rather than a
	// silent fallback to everything — a wrong URL should say so, not quietly
	// show something else and get itself indexed.
	const activeCategory = categories.find((c) => c.slug === categorySlug)
	if (categorySlug && !activeCategory) notFound()

	const [seriesInView, facets] = await Promise.all([
		listPublicSeries(categorySlug),
		listSpecFacets(categorySlug),
	])
	const activeSeries = seriesInView.find((s) => s.slug === seriesSlug)
	if (seriesSlug && !activeSeries) notFound()

	const products = await listPublicProducts({
		categorySlug,
		seriesSlug,
		search: q,
		// Anything unparseable in the query string is ignored rather than
		// erroring: a filter is not worth a 500, and the unfiltered list is a
		// sensible thing to show somebody who mangled a URL.
		wearLayerMil: wear && /^\d+$/.test(wear) ? Number(wear) : undefined,
		thicknessMm: thickness && /^\d+(\.\d+)?$/.test(thickness) ? thickness : undefined,
		sort: sort === "name" || sort === "series" ? sort : "curated",
	})

	// Carried onto the filter links so choosing one keeps whatever search or
	// spec filter is already on.
	const keep = (extra: Record<string, string | undefined>) => {
		const params = new URLSearchParams(
			Object.entries({ ...extra, q, wear, thickness, sort }).filter(([, v]) =>
				Boolean(v),
			) as [string, string][],
		).toString()
		return params ? `/products?${params}` : "/products"
	}

	// The series row only makes sense inside a shelf that has series, and only
	// when there is more than one to choose between. A series link that came
	// from an old URL with no category still shows its row, so it can be undone.
	const showSeries = (activeCategory || activeSeries) && seriesInView.length > 1

	const otherShelves = categories
		.filter((c) => c.slug !== FLOORING_CATEGORY)
		.map((c) => c.name.toLowerCase())

	// The stored name may already end in "Series" — appending another gave
	// "Bronze Series Series". Split it instead: everything but the last word
	// light, the last word bold.
	const heading = activeSeries?.name ?? activeCategory?.name

	return (
		<>
			<section className="bg-paper">
				<div className="mx-auto max-w-[1280px] px-5 pt-8 pb-4">
					<Breadcrumbs
						trail={[
							{ href: "/", label: "Home" },
							{ href: "/products", label: "Catalog" },
							...(activeCategory
								? [
										activeSeries
											? {
													href: `/products?category=${activeCategory.slug}`,
													label: activeCategory.name,
												}
											: { label: activeCategory.name },
									]
								: []),
							...(activeSeries ? [{ label: activeSeries.name }] : []),
						]}
					/>
				</div>
			</section>

			<section className="bg-paper">
				<div className="mx-auto max-w-[1280px] px-5 pb-24 md:pb-32">
					<h1 className="display text-ink text-3xl uppercase sm:text-4xl">
						{heading ? (
							<>
								<span className="font-light">
									{heading.split(" ").slice(0, -1).join(" ")}
								</span>{" "}
								<span className="font-bold">{heading.split(" ").at(-1)}</span>
							</>
						) : (
							<>
								<span className="font-light">The</span>{" "}
								<span className="font-bold">Catalog</span>
							</>
						)}
					</h1>

					<p className="text-muted-foreground mt-3 max-w-2xl text-sm">
						{activeSeries ? (
							<>
								{activeSeries.wearLayerMil &&
									`${activeSeries.wearLayerMil} mil wear layer · `}
								{activeSeries.thicknessMm && `${activeSeries.thicknessMm} mm · `}
								{activeSeries.widthIn && `${activeSeries.widthIn}" wide · `}
								{activeSeries.sqFtPerBox &&
									`${activeSeries.sqFtPerBox} sq ft a box`}
							</>
						) : activeCategory?.blurb ? (
							activeCategory.blurb
						) : (
							<>
								{colours > 0 &&
									`${colours} flooring colours in stock in High Point`}
								{colours > 0 &&
									otherShelves.length > 0 &&
									`, plus ${listOf(otherShelves)}`}
								{colours > 0 && ". "}
								Prices are for dealers —{" "}
								<Link
									href="/login"
									className="text-ink underline underline-offset-4"
								>
									sign in
								</Link>{" "}
								or{" "}
								<Link
									href="/become-a-dealer"
									className="text-ink underline underline-offset-4"
								>
									apply for an account
								</Link>
								.
							</>
						)}
					</p>

					<div className="mt-10">
						<CatalogControls
							wearLayers={facets.wearLayers}
							thicknesses={facets.thicknesses}
							resultCount={products.length}
						/>
					</div>

					<div className="border-rule mt-6 grid gap-4 border-y py-4">
						{categories.length > 1 && (
							<FilterLinks
								label="Shop"
								active={activeCategory?.slug}
								all={{ label: "All", href: keep({}), count: total }}
								items={categories.map((c) => ({
									slug: c.slug,
									name: c.name,
									count: c._count.products,
									href: keep({ category: c.slug }),
								}))}
							/>
						)}

						{showSeries && (
							<FilterLinks
								label="Series"
								active={activeSeries?.slug}
								all={{
									label: activeCategory ? `All ${activeCategory.name}` : "All",
									href: keep({ category: activeCategory?.slug }),
									count: activeCategory?._count.products ?? total,
								}}
								items={seriesInView.map((s) => ({
									slug: s.slug,
									name: s.name,
									count: s._count.products,
									href: keep({ category: activeCategory?.slug, series: s.slug }),
								}))}
							/>
						)}
					</div>

					<div className="mt-12">
						{products.length === 0 ? (
							<p className="text-muted-foreground py-16 text-center text-sm">
								{q || wear || thickness
									? "Nothing matches that. Try clearing a filter."
									: "Nothing published here yet."}
							</p>
						) : (
							<SwatchGrid
								products={products.map((p) => ({
									slug: p.slug,
									name: p.name,
									sku: p.sku,
									image: p.images[0] ?? null,
								}))}
							/>
						)}
					</div>
				</div>
			</section>
		</>
	)
}
