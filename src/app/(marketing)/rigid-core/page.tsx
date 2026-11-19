import type { Metadata } from "next"
import Link from "next/link"
import { FACTS } from "@/constants/catalog"
import { PageHeader } from "../_components/PageHeader"

export const metadata: Metadata = {
	title: "What is Rigid Core?",
	description:
		"Rigid core luxury vinyl plank: stone-based core, 100% waterproof, IXPE pad attached. How it is built and what it is rated for.",
	alternates: { canonical: "/rigid-core" },
}

/**
 * Rebuilt from the client's own /rigidcore.htm, which is currently orphaned —
 * reachable only from a "learn more" link on the home page and absent from the
 * navigation entirely. It is the best product writing he owns and nobody can
 * find it.
 *
 * Copy is his, corrected only for the typos that run through the live site
 * ("ridge core" for rigid core, "vinyI" with a capital I).
 */
const CLAIMS = [
	{
		title: "Waterproof",
		body: "Resistant to water and moisture. It will not swell, peel or buckle when it gets wet, which is why it goes into kitchens, bathrooms and basements where laminate cannot.",
	},
	{
		title: "Pad already attached",
		body: "IXPE padding is bonded to the plank, so there is no separate underlayment to buy, cut or roll out.",
	},
	{
		title: "ScratchGuard surface",
		body: "Rated against indentation, stains and scratches. Residential and commercial both, depending on the wear layer.",
	},
	{
		title: "FloorScore certified",
		body: "Certified for indoor air quality and free of phthalates, formaldehyde and VOC emissions.",
	},
	{
		title: "Resists mold and bacteria",
		body: "Impedes microorganism growth — long-term protection against bacteria, fungi and molds.",
	},
	{
		title: "Fire resistant",
		body: "Resistant to fire damage and will not assist the spread of a fire.",
	},
]

export default function RigidCorePage() {
	return (
		<>
			<PageHeader
				trail={[{ href: "/", label: "Home" }, { label: "Rigid Core" }]}
				light="What is"
				bold="rigid core?"
				intro="Combining the strength of stone with the look of authentic wood. It withstands extreme temperature swings, indentations and stains, and it is 100% waterproof."
			/>

			<section className="bg-band">
				<div className="mx-auto max-w-[1280px] px-5 py-20 md:py-24">
					<div className="grid gap-10 md:grid-cols-[1fr_1fr] md:items-center">
						<div>
							<p className="display text-ink text-5xl sm:text-6xl">
								{FACTS.checkpoints}
							</p>
							<p className="display text-muted-foreground mt-3 text-sm uppercase">
								Checkpoints per plank
							</p>
						</div>
						<p className="text-sm leading-relaxed">
							Every plank we deliver is first quality. Each one passes through{" "}
							{FACTS.productionProcesses} production processes and a total of{" "}
							{FACTS.checkpoints} checkpoints before it reaches the warehouse in High
							Point.
						</p>
					</div>
				</div>
			</section>

			<section className="bg-paper">
				<div className="mx-auto max-w-[1280px] px-5 py-20 md:py-24">
					<h2 className="display text-ink text-2xl uppercase sm:text-3xl">
						<span className="font-light">What it</span>{" "}
						<span className="font-bold">stands up to</span>
					</h2>

					<dl className="mt-12 grid gap-x-14 gap-y-10 sm:grid-cols-2">
						{CLAIMS.map((claim) => (
							<div key={claim.title} className="border-rule border-t pt-5">
								<dt className="display text-ink text-base">{claim.title}</dt>
								<dd className="text-muted-foreground mt-2 text-sm leading-relaxed">
									{claim.body}
								</dd>
							</div>
						))}
					</dl>
				</div>
			</section>

			<section className="bg-band">
				<div className="mx-auto max-w-[1280px] px-5 py-20 text-center">
					<h2 className="display text-ink text-2xl uppercase sm:text-3xl">
						<span className="font-light">Made without</span>{" "}
						<span className="font-bold">cutting a tree</span>
					</h2>
					<p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm">
						Production is designed around a sustainable environment. Zero trees are used
						to make a rigid core floor that looks like one.
					</p>
					<div className="mt-10">
						<Link href="/products" className="btn bg-ink text-paper">
							See the colors
						</Link>
					</div>
				</div>
			</section>
		</>
	)
}
