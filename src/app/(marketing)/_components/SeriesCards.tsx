import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

export interface SeriesCard {
	slug: string
	name: string
	/** The row's own line. Editable in admin, so a rename keeps its copy. */
	blurb: string | null
	colourCount: number
	wearLayerMil: number | null
	sqFtPerBox: string | null
	image: string | null
}

/**
 * The series cards, laid out the way the reference site lays out its markets:
 * image on top, light-grey body below, a twenty-pixel radius on the card while
 * the buttons elsewhere stay hard-cornered.
 *
 * That site fills the image slot with lifestyle photography. This client owns
 * none, so the slot takes the material instead — the factory's print film for a
 * colour in that series. It is the honest substitute, and it is worth telling
 * him plainly that photographs would do more here.
 *
 * The count is not fixed. This was three cards in a hard `md:grid-cols-3`, back
 * when Bronze, Silver and Gold were the whole catalogue; the client is dropping
 * those names and bringing more lines, so the column count is chosen from how
 * many there actually are. Four across would make the cards too narrow to read
 * the spec line, so anything past three wraps into rows of three.
 */
export function SeriesCards({ series }: { series: SeriesCard[] }) {
	return (
		<div
			className={cn(
				"grid gap-8",
				series.length === 1 && "mx-auto max-w-md",
				series.length === 2 && "md:grid-cols-2",
				series.length >= 3 && "sm:grid-cols-2 md:grid-cols-3",
			)}
		>
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
						{item.blurb && (
							<p className="text-muted-foreground mt-2 text-sm leading-relaxed">
								{item.blurb}
							</p>
						)}
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
