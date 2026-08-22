import Image from "next/image"
import Link from "next/link"
import { SERIES, SWATCHES } from "@/constants/catalog"

/**
 * Three cards, laid out the way the reference site lays out its markets:
 * image on top, light-grey body below, twenty-pixel radius on the card while
 * the buttons elsewhere stay hard-cornered.
 *
 * That site fills the image slot with lifestyle photography. This client owns
 * none, so the slot takes the material instead — the factory's own print film
 * for a colour in that series. It is the one honest substitute available, and
 * it is worth telling him plainly that photographs would do more here.
 */
export function SeriesCards() {
	return (
		<div className="grid gap-8 md:grid-cols-3">
			{SERIES.map((series) => {
				const swatch = SWATCHES.find((s) => s.series === series.tone)

				return (
					<Link
						key={series.slug}
						href={`/products?series=${series.slug}`}
						className="group overflow-hidden rounded-[20px] transition-opacity hover:opacity-95"
					>
						<div className="relative aspect-[16/10]">
							{swatch && (
								<Image
									src={swatch.src}
									alt=""
									fill
									sizes="(min-width: 768px) 33vw, 100vw"
									className="object-cover"
								/>
							)}
						</div>
						<div className="bg-band px-7 py-6">
							<h3 className="display text-ink text-xl">{series.name} Series</h3>
							<p className="text-muted-foreground mt-2 text-sm leading-relaxed">
								{series.claim}
							</p>
							<p className="text-muted-foreground mt-4 text-xs">
								{series.colourCount} colours · {series.wearLayerMil} mil ·{" "}
								{series.sqFtPerBox} sq ft a box
							</p>
						</div>
					</Link>
				)
			})}
		</div>
	)
}
