import Image from "next/image"
import Link from "next/link"

export interface SwatchCard {
	slug: string
	name: string
	sku: string
	image: string | null
}

/**
 * The catalog preview, following the reference site's product library: a tile
 * of the material, the name in bold beneath it, and the SKU under that in
 * smaller grey type.
 *
 * The SKU line matters more here than it looks. The current ODF catalog shows
 * no codes at all and dealers order by code, so the scheme has to be settled
 * before this ships — what renders below is the provisional one from the seed.
 */
export function SwatchGrid({ products }: { products: SwatchCard[] }) {
	return (
		<ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
			{products.map((product) => (
				<li key={product.slug}>
					<Link href={`/products/${product.slug}`} className="group block">
						<div className="border-rule bg-band relative aspect-square border transition-opacity group-hover:opacity-90">
							{product.image && (
								<Image
									src={product.image}
									alt={product.name}
									fill
									sizes="(min-width: 1024px) 16vw, 33vw"
									className="object-cover"
								/>
							)}
						</div>
						<p className="display text-ink mt-3 text-center text-sm">{product.name}</p>
						<p className="text-muted-foreground mt-0.5 text-center font-mono text-xs">
							{product.sku}
						</p>
					</Link>
				</li>
			))}
		</ul>
	)
}
