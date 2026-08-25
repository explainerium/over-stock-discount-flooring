import { DownloadIcon } from "lucide-react"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { SHOWROOM } from "@/constants/catalog"
import { getPublicProduct } from "@/server/repositories/catalog"
import { Breadcrumbs } from "../../_components/Breadcrumbs"
import { CoverageCalculator } from "../../_components/CoverageCalculator"
import { SampleRequest } from "./_components/SampleRequest"
import { SITE_URL } from "@/constants/site"

/**
 * One URL per colour.
 *
 * The current site has thirty-four colours living at three URLs, which means
 * nothing to link to, nothing to rank and nothing for a dealer to send someone.
 * These pages are the fix, and they are the largest single SEO gain available
 * in the rebuild.
 */

/**
 * Cached for an hour, and busted the moment the owner saves.
 *
 * Deliberately not `generateStaticParams`. Pre-rendering all thirty-four at
 * build time would be faster on paper, but it ties every deploy to the database
 * being reachable and — worse for this client — a colour he publishes would not
 * appear until somebody redeployed. The catalogue is his to edit, so the page
 * has to follow him.
 *
 * `revalidatePath` in the product actions clears these on save, so the hour is
 * only ever a backstop.
 */
export const revalidate = 3600

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>
}): Promise<Metadata> {
	const { slug } = await params
	const product = await getPublicProduct(slug)
	if (!product) return {}

	const specs = [
		product.series.wearLayerMil && `${product.series.wearLayerMil} mil wear layer`,
		product.series.widthIn && `${product.series.widthIn}" wide`,
		product.series.sqFtPerBox && `${product.series.sqFtPerBox} sq ft a box`,
	]
		.filter(Boolean)
		.join(", ")

	return {
		title: `${product.name} — ${product.series.name}`,
		description: `${product.name} rigid core luxury vinyl plank. ${specs}. In stock in High Point, North Carolina.`,
		alternates: { canonical: `/products/${product.slug}` },
		openGraph: {
			title: `${product.name} · ${product.series.name}`,
			images: product.images[0] ? [product.images[0]] : undefined,
		},
	}
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params
	const product = await getPublicProduct(slug)
	if (!product) notFound()

	const { series } = product
	const certifications = series.facts.filter((fact) => fact.kind === "CERTIFICATION")
	const tests = series.facts.filter((fact) => fact.kind === "TEST_RESULT")

	const spec: [string, string | null][] = [
		["Series", series.name],
		["Length", series.lengthIn ? `${series.lengthIn}"` : null],
		["Width", series.widthIn ? `${series.widthIn}"` : null],
		["Thickness", series.thicknessMm ? `${series.thicknessMm} mm` : null],
		["Wear layer", series.wearLayerMil ? `${series.wearLayerMil} mil` : null],
		["Finish", series.finishing],
		["Edge", series.edgeProfile],
		["Coverage", series.sqFtPerBox ? `${series.sqFtPerBox} sq ft per box` : null],
		["Boxes per pallet", series.boxesPerPallet ? String(series.boxesPerPallet) : null],
		["Box weight", series.lbPerBox ? `${series.lbPerBox} lb` : null],
	]

	const calculatorSeries =
		series.sqFtPerBox && series.boxesPerPallet
			? [
					{
						slug: series.slug,
						name: series.name,
						sqFtPerBox: series.sqFtPerBox.toString(),
						boxesPerPallet: series.boxesPerPallet,
					},
				]
			: []

	/**
	 * Product schema. The current site has no structured data of any kind, and
	 * for a catalogue this size it is the cheapest SEO available.
	 *
	 * No `offers` block: prices are only shown to signed-in dealers, and
	 * publishing one here would both contradict that and be wrong for most
	 * visitors.
	 */
	const origin = SITE_URL

	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "Product",
		name: product.name,
		sku: product.sku,
		url: new URL(`/products/${product.slug}`, origin).toString(),
		category: `${series.name} rigid core luxury vinyl plank`,
		image: product.images.map((src) => new URL(src, origin).toString()),
		brand: { "@type": "Brand", name: "Overstock Discount Flooring" },
		description: product.description ?? undefined,
	}

	return (
		<>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
			/>

			<section className="bg-paper">
				<div className="mx-auto max-w-[1280px] px-5 pt-8 pb-4">
					<Breadcrumbs
						trail={[
							{ href: "/", label: "Home" },
							{ href: "/products", label: "Catalog" },
							{ href: `/products?series=${series.slug}`, label: series.name },
							{ label: product.name },
						]}
					/>
				</div>
			</section>

			<section className="bg-paper">
				<div className="mx-auto grid max-w-[1280px] gap-12 px-5 pb-20 lg:grid-cols-2">
					<div className="border-rule bg-band relative aspect-[4/5] border">
						{product.images[0] && (
							<Image
								src={product.images[0]}
								alt={`${product.name} — ${series.name} rigid core luxury vinyl plank`}
								fill
								priority
								sizes="(min-width: 1024px) 50vw, 100vw"
								className="object-cover"
							/>
						)}
					</div>

					<div>
						<p className="display text-muted-foreground text-xs uppercase">
							{series.name}
						</p>
						<h1 className="display text-ink mt-2 text-4xl uppercase">{product.name}</h1>
						<p className="text-muted-foreground mt-2 font-mono text-sm">
							{product.sku}
						</p>

						{product.description && (
							<p className="mt-6 text-sm leading-relaxed">{product.description}</p>
						)}

						{/* Prices are dealer-only by the client's own instruction, so the
						    public page says where they are rather than showing nothing. */}
						<div className="bg-band mt-8 p-6">
							<p className="display text-ink text-sm uppercase">Pricing</p>
							<p className="text-muted-foreground mt-2 text-sm">
								Dealer pricing is shown after you sign in.{" "}
								<Link
									href="/login"
									className="text-ink underline underline-offset-4"
								>
									Sign in
								</Link>{" "}
								or{" "}
								<Link
									href="/become-a-dealer"
									className="text-ink underline underline-offset-4"
								>
									apply for an account
								</Link>
								. Buying for your own home? Call{" "}
								<a href={SHOWROOM.phoneHref} className="text-ink">
									{SHOWROOM.phone}
								</a>
								.
							</p>
						</div>

						<dl className="mt-10">
							{spec
								.filter(([, value]) => value)
								.map(([label, value]) => (
									<div
										key={label}
										className="border-rule flex justify-between gap-6 border-b py-2.5 text-sm"
									>
										<dt className="text-muted-foreground">{label}</dt>
										<dd className="text-right font-medium">{value}</dd>
									</div>
								))}
						</dl>

						{(series.warrantyPdfUrl || series.installationPdfUrl) && (
							<div className="mt-8 flex flex-wrap gap-3">
								{series.installationPdfUrl && (
									<a
										href={series.installationPdfUrl}
										className="display text-ink flex items-center gap-2 border-b border-current pb-1 text-xs uppercase"
									>
										<DownloadIcon className="size-4" aria-hidden />
										Installation guide
									</a>
								)}
								{series.warrantyPdfUrl && (
									<a
										href={series.warrantyPdfUrl}
										className="display text-ink flex items-center gap-2 border-b border-current pb-1 text-xs uppercase"
									>
										<DownloadIcon className="size-4" aria-hidden />
										Warranty
									</a>
								)}
							</div>
						)}
					</div>
				</div>
			</section>

			{calculatorSeries.length > 0 && (
				<section className="bg-band">
					<div className="mx-auto grid max-w-[1280px] gap-12 px-5 py-20 lg:grid-cols-[1fr_24rem] lg:items-center">
						<div>
							<h2 className="display text-ink text-2xl uppercase sm:text-3xl">
								<span className="font-light">How much</span>{" "}
								<span className="font-bold">{product.name}?</span>
							</h2>
							<p className="text-muted-foreground mt-4 max-w-lg text-sm leading-relaxed">
								{series.name} ships {series.sqFtPerBox?.toString()} square feet to a
								box, so the answer is never quite the number you measured. Enter
								your square footage and we round up to whole boxes.
							</p>
						</div>
						<CoverageCalculator series={calculatorSeries} />
					</div>
				</section>
			)}

			{/* A colour is hard to judge on a screen, and this is the cheapest
			    way for somebody to be sure before they order a pallet of it. */}
			<section className="bg-band">
				<div className="mx-auto max-w-[1280px] px-5 py-20">
					<h2 className="display text-ink text-2xl uppercase sm:text-3xl">
						See it in person
					</h2>
					<p className="text-muted-foreground mt-4 max-w-lg text-sm leading-relaxed">
						Screens lie about colour. We will post you a piece of {product.name} so you
						can hold it against the cabinets before you commit to a floor.
					</p>
					<div className="mt-8">
						<SampleRequest productId={product.id} productName={product.name} />
					</div>
				</div>
			</section>

			{series.facts.length > 0 && (
				<section className="bg-paper">
					<div className="mx-auto max-w-[1280px] px-5 py-20">
						<h2 className="display text-ink text-2xl uppercase sm:text-3xl">
							<span className="font-light">Tested and</span>{" "}
							<span className="font-bold">certified</span>
						</h2>

						<div className="mt-8 flex flex-wrap gap-x-8 gap-y-2">
							{certifications.map((fact) => (
								<div key={fact.id} className="text-sm">
									<span className="font-medium">{fact.label}</span>
									{fact.standard && (
										<span className="text-muted-foreground ml-2 font-mono text-xs">
											{fact.standard}
										</span>
									)}
								</div>
							))}
						</div>

						<dl className="mt-10 grid gap-x-12 sm:grid-cols-2">
							{tests.map((fact) => (
								<div
									key={fact.id}
									className="border-rule flex justify-between gap-6 border-b py-2.5 text-sm"
								>
									<dt className="text-muted-foreground">
										{fact.label}
										{fact.standard && (
											<span className="ml-1.5 font-mono text-xs">
												{fact.standard}
											</span>
										)}
									</dt>
									<dd className="text-right font-medium">{fact.result}</dd>
								</div>
							))}
						</dl>
					</div>
				</section>
			)}
		</>
	)
}
