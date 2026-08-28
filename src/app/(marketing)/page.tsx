import Link from "next/link"
import { FACTS, SHOWROOM } from "@/constants/catalog"
import {
	countPublicColours,
	listPublicProducts,
	listPublicSeries,
} from "@/server/repositories/catalog"
import { CoverageCalculator } from "./_components/CoverageCalculator"
import { SeriesCards } from "./_components/SeriesCards"
import { SwatchGrid } from "./_components/SwatchGrid"

/**
 * Home page, built to the reference site's structure.
 *
 * The shape is theirs, deliberately: a solid dark hero carrying nothing but a
 * large centred heading and a row of hard-cornered white buttons, then bands
 * alternating white and #EFEFEF at roughly 130px of vertical padding, each
 * opening with a heading that mixes one bold word against one light one.
 *
 * The content is this client's. Everything factual on this page — the colour
 * count, the coverage figures, the 89 checkpoints — comes off his own catalogue.
 */

const RIGID_CORE = [
	"100% waterproof. Won't swell, peel or buckle.",
	"IXPE padding attached, so no separate underlayment.",
	"ScratchGuard surface — rated against indentation and stains.",
	"FloorScore certified. No phthalates, formaldehyde or VOC emissions.",
	"Resists microorganism growth — bacteria, fungi and mould.",
	"Fire resistant. Won't help a fire spread.",
]

/**
 * The series count, set in a display heading rather than a sentence, so it is
 * spelled out. Was the literal "Three series." until the client said he is
 * dropping the Bronze/Silver/Gold names and adding lines — a heading that
 * contradicts the cards under it is worse than one that just counts them.
 * Past ten it falls back to digits, which no real catalogue should reach.
 */
const NUMBER_WORD = [
	"No",
	"One",
	"Two",
	"Three",
	"Four",
	"Five",
	"Six",
	"Seven",
	"Eight",
	"Nine",
	"Ten",
]

const countWord = (n: number) => NUMBER_WORD[n] ?? String(n)

export default async function HomePage() {
	// One fetch at the page, handed down. The calculator is a client component
	// and cannot query; the cards and the grid could, but three round trips for
	// one screen is three round trips.
	const [series, products, colourCount] = await Promise.all([
		listPublicSeries(),
		listPublicProducts({ take: 12 }),
		countPublicColours(),
	])

	const seriesCards = series
		.filter((s) => s.sqFtPerBox)
		.map((s) => ({
			slug: s.slug,
			name: s.name,
			blurb: s.blurb,
			colourCount: s._count.products,
			wearLayerMil: s.wearLayerMil,
			sqFtPerBox: s.sqFtPerBox?.toString() ?? null,
			image: s.products[0]?.images[0] ?? null,
		}))

	const calculatorSeries = series
		.filter((s) => s.sqFtPerBox && s.boxesPerPallet)
		.map((s) => ({
			slug: s.slug,
			name: s.name,
			sqFtPerBox: s.sqFtPerBox!.toString(),
			boxesPerPallet: s.boxesPerPallet!,
		}))

	return (
		<>
			{/* ---------------------------------------------------------------- */}
			{/* Hero — solid, centred, no image. Straight from the reference.     */}
			{/* ---------------------------------------------------------------- */}
			<section className="bg-ink text-paper">
				<div className="mx-auto max-w-[1280px] px-5 py-28 text-center md:py-36">
					<h1 className="display text-4xl uppercase sm:text-5xl lg:text-6xl">
						Rigid Core
						<br />
						Luxury Vinyl Plank
					</h1>
					<p className="mx-auto mt-6 max-w-xl text-base opacity-80">
						Factory direct and stocked by the pallet in High Point, North Carolina.
					</p>
					<div className="mt-10 flex flex-wrap justify-center gap-3">
						<Link href="/products" className="btn bg-paper text-ink">
							Explore the catalog
						</Link>
						<Link href="/rigid-core" className="btn bg-paper text-ink">
							Why rigid core
						</Link>
						<Link href="/become-a-dealer" className="btn bg-paper text-ink">
							Become a dealer
						</Link>
					</div>
				</div>
			</section>

			{/* ---------------------------------------------------------------- */}
			<section className="bg-paper">
				<div className="mx-auto max-w-[1280px] px-5 py-24 md:py-32">
					<h2 className="display text-ink text-center text-3xl uppercase sm:text-4xl">
						<span className="font-bold">{countWord(seriesCards.length)} series.</span>{" "}
						<span className="font-light">One warehouse.</span>
					</h2>
					<p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-center text-sm">
						Every series is 48&quot; plank, 5 mm, micro bevelled, with the pad already
						attached. What changes between them is the width, the emboss and how hard
						the surface is.
					</p>
					<div className="mt-14">
						<SeriesCards series={seriesCards} />
					</div>
				</div>
			</section>

			{/* ---------------------------------------------------------------- */}
			<section className="bg-band">
				<div className="mx-auto max-w-[1280px] px-5 py-24 md:py-32">
					<h2 className="display text-ink text-3xl uppercase sm:text-4xl">
						<span className="font-light">Overstock</span>{" "}
						<span className="font-bold">Colours</span>
					</h2>
					<p className="text-muted-foreground mt-3 text-sm">
						{colourCount} on the shelf today. Come and stand on any of them.
					</p>

					<div className="mt-12">
						<SwatchGrid
							products={products.map((p) => ({
								slug: p.slug,
								name: p.name,
								sku: p.sku,
								image: p.images[0] ?? null,
							}))}
						/>
					</div>

					<div className="mt-12">
						<Link href="/products" className="btn bg-ink text-paper">
							See all {colourCount} colours
						</Link>
					</div>
				</div>
			</section>

			{/* ---------------------------------------------------------------- */}
			{/* The calculator. Not in the hero any more — the reference keeps    */}
			{/* its own in Resources, and the client asked to land close to it.   */}
			{/* ---------------------------------------------------------------- */}
			<section className="bg-paper">
				<div className="mx-auto grid max-w-[1280px] gap-12 px-5 py-24 md:py-32 lg:grid-cols-[1fr_24rem] lg:items-center">
					<div>
						<h2 className="display text-ink text-3xl uppercase sm:text-4xl">
							<span className="font-light">How much</span>{" "}
							<span className="font-bold">do you need?</span>
						</h2>
						<p className="text-muted-foreground mt-4 max-w-lg text-sm leading-relaxed">
							Flooring ships by the box, so the answer is never quite the number you
							measured. Enter your square footage and we round up to whole boxes and
							show what they actually cover.
						</p>
						<p className="text-muted-foreground mt-4 max-w-lg text-sm leading-relaxed">
							Add a waste factor if you are cutting around a lot of corners — most
							installers allow five or ten percent.
						</p>
					</div>
					<CoverageCalculator series={calculatorSeries} />
				</div>
			</section>

			{/* ---------------------------------------------------------------- */}
			<section className="bg-band">
				<div className="mx-auto max-w-[1280px] px-5 py-24 md:py-32">
					<h2 className="display text-ink text-center text-3xl uppercase sm:text-4xl">
						<span className="font-light">Why</span>{" "}
						<span className="font-bold">rigid core</span>
					</h2>
					<p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-center text-sm">
						Stone-based core, wood look, no swelling. Every plank goes through{" "}
						{FACTS.productionProcesses} production stages and {FACTS.checkpoints}{" "}
						checkpoints before it reaches the warehouse.
					</p>

					<ul className="mx-auto mt-14 grid max-w-4xl gap-x-12 gap-y-7 sm:grid-cols-2">
						{RIGID_CORE.map((claim) => (
							<li key={claim} className="border-rule border-t pt-4 text-sm">
								{claim}
							</li>
						))}
					</ul>

					<div className="mt-14 text-center">
						<Link href="/rigid-core" className="btn bg-ink text-paper">
							The full specification
						</Link>
					</div>
				</div>
			</section>

			{/* ---------------------------------------------------------------- */}
			<section className="bg-ink text-paper">
				<div className="mx-auto grid max-w-[1280px] gap-8 px-5 py-20 md:grid-cols-[1fr_auto] md:items-center">
					<div>
						<h2 className="display text-2xl uppercase sm:text-3xl">
							<span className="font-light">Buying for a</span>{" "}
							<span className="font-bold">flooring business?</span>
						</h2>
						<p className="mt-4 max-w-xl text-sm opacity-80">
							Dealers get their own pricing, order by the box, pallet or square foot,
							and send an order straight through instead of ringing for a quote.
							Accounts are set up by invitation.
						</p>
					</div>
					<div className="flex flex-wrap gap-3">
						<Link href="/become-a-dealer" className="btn bg-paper text-ink">
							Apply for an account
						</Link>
						<Link href="/login" className="btn border border-white/40">
							Dealer login
						</Link>
					</div>
				</div>
			</section>

			{/* ---------------------------------------------------------------- */}
			<section className="bg-paper">
				<div className="mx-auto max-w-[1280px] px-5 py-24 md:py-32">
					<h2 className="display text-ink text-center text-3xl uppercase sm:text-4xl">
						<span className="font-light">Come and</span>{" "}
						<span className="font-bold">stand on it</span>
					</h2>
					<p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-center text-sm">
						A family-owned business, nearly a decade in High Point. Every colour we
						stock is on the rack, full length, under real light.
					</p>

					<dl className="mx-auto mt-14 grid max-w-3xl gap-10 text-center sm:grid-cols-3">
						<div>
							<dt className="display text-muted-foreground text-xs uppercase">
								Showroom
							</dt>
							<dd className="mt-3 text-sm">
								{SHOWROOM.street}
								<br />
								{SHOWROOM.city}, {SHOWROOM.state} {SHOWROOM.zip}
							</dd>
						</div>
						<div>
							<dt className="display text-muted-foreground text-xs uppercase">
								Open
							</dt>
							<dd className="mt-3 text-sm">
								{SHOWROOM.weekdays}
								<br />
								{SHOWROOM.saturday}
							</dd>
						</div>
						<div>
							<dt className="display text-muted-foreground text-xs uppercase">
								Call
							</dt>
							<dd className="mt-3 text-sm">
								<a href={SHOWROOM.phoneHref}>{SHOWROOM.phone}</a>
							</dd>
						</div>
					</dl>
				</div>
			</section>
		</>
	)
}
