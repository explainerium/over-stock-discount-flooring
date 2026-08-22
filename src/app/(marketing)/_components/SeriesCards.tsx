import Image from "next/image"
import Link from "next/link"
import { SERIES_CLAIM } from "@/constants/catalog"

export interface SeriesCard {
	slug: string
	name: string
	colourCount: number
	wearLayerMil: number | null
	sqFtPerBox: string | null
	image: string | null
}

/**
 * Three cards, laid out the way the reference site lays out its markets: image
 * on top, light-grey body below, a twenty-pixel radius on the card while the
 * buttons elsewhere stay hard-cornered.
 *
 * That site fills the image slot with lifestyle photography. This client owns
 * none, so the slot takes the material instead — the factory's print film for a
 * colour in that series. It is the honest substitute, and it is worth telling
 * him plainly that photographs would do more here.
 */
export function SeriesCards({ series }: { series: SeriesCard[] }) {
	return (
		<div className="grid gap-8 md:grid-cols-3">
			{series.map((item) => (
				<Link
					key={item.slug}
					href={`/products?series=${item.slug}`}
					className="group overflow-hidden rounded-[20px] transition-opacity hover:opacity-95"
				>
					<div className="bg-band relative aspect-[16/10]">
						{item.image && (
							<Image
								src={item.image}
								alt=""
								fill
								sizes="(min-width: 768px) 33vw, 100vw"
								className="object-cover"
							/>
						)}
					</div>
					<div className="bg-band px-7 py-6">
						<h3 className="display text-ink text-xl">{item.name}</h3>
						<p className="text-muted-foreground mt-2 text-sm leading-relaxed">
							{SERIES_CLAIM[item.slug] ?? ""}
						</p>
						<p className="text-muted-foreground mt-4 text-xs">
							{item.colourCount} colours
							{item.wearLayerMil && ` · ${item.wearLayerMil} mil`}
							{item.sqFtPerBox && ` · ${item.sqFtPerBox} sq ft a box`}
						</p>
					</div>
				</Link>
			))}
		</div>
	)
}
