/**
 * The catalog's default arrangement: flooring by wear layer, then everything
 * else by category.
 *
 * The client, 19 November: "Change the default flooring catalog order from
 * alphabetical to wear-layer grouping … 12 Mil, 20 Mil, 22 Mil, 28 Mil.
 * Products should appear under their respective wear-layer categories." A
 * buyer matching a spec knows the wear layer, not which series carries it, so
 * two series at 20 mil sit together.
 *
 * Order inside a group is whatever order the products arrive in — the curated
 * order, series first, then the client's own sheet order — so this only ever
 * moves products between groups, never within one.
 */

export interface Groupable {
	category: { slug: string; name: string }
	/** Flooring is a series with square feet per box; anything else is a shelf. */
	series: { wearLayerMil: number | null; sqFtPerBox: unknown } | null
}

export interface CatalogGroup<T> {
	key: string
	title: string
	products: T[]
}

export function groupByWearLayer<T extends Groupable>(products: T[]): CatalogGroup<T>[] {
	const byWear = new Map<number, T[]>()
	const flooringWithoutWear: T[] = []
	const shelves = new Map<string, CatalogGroup<T>>()

	for (const product of products) {
		const flooring = product.series && product.series.sqFtPerBox != null
		if (flooring) {
			const mil = product.series!.wearLayerMil
			if (mil == null) flooringWithoutWear.push(product)
			else byWear.set(mil, [...(byWear.get(mil) ?? []), product])
			continue
		}
		const shelf = shelves.get(product.category.slug) ?? {
			key: `category-${product.category.slug}`,
			title: product.category.name,
			products: [],
		}
		shelf.products.push(product)
		shelves.set(product.category.slug, shelf)
	}

	return [
		...[...byWear.entries()]
			.sort(([a], [b]) => a - b)
			.map(([mil, list]) => ({
				key: `wear-${mil}`,
				title: `${mil} Mil Wear Layer`,
				products: list,
			})),
		...(flooringWithoutWear.length
			? [{ key: "wear-other", title: "Other Flooring", products: flooringWithoutWear }]
			: []),
		...shelves.values(),
	]
}
