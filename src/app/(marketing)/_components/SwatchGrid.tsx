import Image from "next/image"
import Link from "next/link"
import { SWATCHES } from "@/constants/catalog"

/**
 * The catalogue preview, following the reference site's product library: a tile
 * of the material, the name in bold beneath it, and the SKU under that in
 * smaller grey type.
 *
 * The SKU line matters more here than it looks. The current ODF catalogue shows
 * no codes at all, and dealers order by code — so the scheme has to be settled
 * before this ships. What is rendered below is provisional.
 */
export function SwatchGrid({ limit = 12 }: { limit?: number }) {
	return (
		<ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
			{SWATCHES.slice(0, limit).map((swatch) => (
				<li key={swatch.src}>
					<Link href="/products" className="group block">
						<div className="border-rule relative aspect-square border transition-opacity group-hover:opacity-90">
							<Image
								src={swatch.src}
								alt={swatch.name}
								fill
								sizes="(min-width: 1024px) 16vw, 33vw"
								className="object-cover"
							/>
						</div>
						<p className="display text-ink mt-3 text-center text-sm">{swatch.name}</p>
						<p className="text-muted-foreground mt-0.5 text-center text-xs">
							{swatch.series.toUpperCase().slice(0, 2)}-
							{swatch.name.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 4)}
						</p>
					</Link>
				</li>
			))}
		</ul>
	)
}
