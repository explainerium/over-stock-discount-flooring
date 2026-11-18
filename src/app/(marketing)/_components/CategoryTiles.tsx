import Image from "next/image"
import Link from "next/link"

export interface CategoryTile {
	slug: string
	name: string
	count: number
	image: string | null
}

/**
 * The shelves beyond flooring — trim, stair products, butcher block, padding.
 *
 * Read from the categories the owner has published, so a shelf appears here
 * the day its first product goes live and never before.
 */
export function CategoryTiles({ categories }: { categories: CategoryTile[] }) {
	return (
		<ul className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-5">
			{categories.map((category) => (
				<li key={category.slug}>
					<Link href={`/products?category=${category.slug}`} className="group block">
						<div className="border-rule bg-band relative aspect-square border transition-opacity group-hover:opacity-90">
							{category.image && (
								<Image
									src={category.image}
									alt=""
									fill
									sizes="(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 50vw"
									className="object-cover"
								/>
							)}
						</div>
						<p className="display text-ink mt-3 text-sm uppercase">{category.name}</p>
						<p className="text-muted-foreground mt-0.5 text-xs">
							{category.count} {category.count === 1 ? "product" : "products"}
						</p>
					</Link>
				</li>
			))}
		</ul>
	)
}
