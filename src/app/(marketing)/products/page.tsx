import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { SwatchGrid } from "../_components/SwatchGrid"
import { Breadcrumbs } from "../_components/Breadcrumbs"
import { CatalogControls } from "./_components/CatalogControls"
import { SeriesFilter } from "./_components/SeriesFilter"
import {
	countPublicColours,
	countPublicProducts,
	listPublicProducts,
	listSpecFacets,
	listPublicSeries,
} from "@/server/repositories/catalog"

export async function generateMetadata({
	searchParams,
}: {
	searchParams: Promise<{ series?: string }>
}): Promise<Metadata> {
	const { series } = await searchParams
	const title = series
		? `${series.charAt(0).toUpperCase()}${series.slice(1)} Series`
		: "Rigid Core LVP Catalog"

	return {
		title,
		description:
			"Every rigid core luxury vinyl plank colour we stock in High Point, North Carolina. Factory direct, by the box or the pallet.",
		alternates: { canonical: series ? `/products?series=${series}` : "/products" },
	}
}

export default async function ProductsPage({
	searchParams,
}: {
	searchParams: Promise<{
		series?: string
		q?: string
		wear?: string
		thickness?: string
		sort?: string
	}>
}) {
	const { series: seriesSlug, q, wear, thickness, sort } = await searchParams

	const [allSeries, total, colours, facets] = await Promise.all([
		listPublicSeries(),
		countPublicProducts(),
		countPublicColours(),
		listSpecFacets(),
	])

	// An unknown series in the query string is a 404 rather than a silent
	// fallback to everything — a wrong URL should say so, not quietly show
	// something else and get itself indexed.
	if (seriesSlug && !allSeries.some((s) => s.slug === seriesSlug)) notFound()

	const products = await listPublicProducts({
		seriesSlug,
		search: q,
		// Anything unparseable in the query string is ignored rather than
		// erroring: a filter is not worth a 500, and the unfiltered list is a
		// sensible thing to show somebody who mangled a URL.
		wearLayerMil: wear && /^\d+$/.test(wear) ? Number(wear) : undefined,
		thicknessMm: thickness && /^\d+(\.\d+)?$/.test(thickness) ? thickness : undefined,
		sort: sort === "name" || sort === "series" ? sort : "curated",
	})
	const active = allSeries.find((s) => s.slug === seriesSlug)

	// Carried onto the series links so choosing one keeps whatever search or
	// spec filter is already on. Series is excluded — that is what the link sets.
	const keep = new URLSearchParams(
		Object.entries({ q, wear, thickness, sort }).filter(([, v]) => Boolean(v)) as [
			string,
			string,
		][],
	).toString()

	return (
		<>
			<section className="bg-paper">
				<div className="mx-auto max-w-[1280px] px-5 pt-8 pb-4">
					<Breadcrumbs
						trail={[
							{ href: "/", label: "Home" },
							{ href: "/products", label: "Catalog" },
							...(active ? [{ label: active.name }] : []),
						]}
					/>
				</div>
			</section>

			<section className="bg-paper">
				<div className="mx-auto max-w-[1280px] px-5 pb-24 md:pb-32">
					<h1 className="display text-ink text-3xl uppercase sm:text-4xl">
						{active ? (
							// The stored name already ends in 'Series' — appending another
							// gave 'Bronze Series Series'. Split it instead: everything but
							// the last word light, the last word bold.
							<>
								<span className="font-light">
									{active.name.split(" ").slice(0, -1).join(" ")}
								</span>{" "}
								<span className="font-bold">{active.name.split(" ").at(-1)}</span>
							</>
						) : (
							<>
								<span className="font-light">The</span>{" "}
								<span className="font-bold">Catalog</span>
							</>
						)}
					</h1>

					<p className="text-muted-foreground mt-3 max-w-2xl text-sm">
						{active ? (
							<>
								{active.wearLayerMil && `${active.wearLayerMil} mil wear layer · `}
								{active.thicknessMm && `${active.thicknessMm} mm · `}
								{active.widthIn && `${active.widthIn}" wide · `}
								{active.sqFtPerBox && `${active.sqFtPerBox} sq ft a box`}
							</>
						) : (
							<>
								{colours} colours in stock in High Point, plus trim. Prices are for
								dealers —{" "}
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

					<div className="mt-6">
						<SeriesFilter
							keep={keep}
							total={total}
							active={seriesSlug}
							series={allSeries.map((s) => ({
								slug: s.slug,
								name: s.name,
								count: s._count.products,
							}))}
						/>
					</div>

					<div className="mt-12">
						{products.length === 0 ? (
							<p className="text-muted-foreground py-16 text-center text-sm">
								{q || wear || thickness
									? "Nothing matches that. Try clearing a filter."
									: "Nothing published in this series yet."}
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
