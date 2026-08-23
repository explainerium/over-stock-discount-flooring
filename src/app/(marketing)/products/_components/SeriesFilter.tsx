import Link from "next/link"
import { cn } from "@/lib/utils"

export interface FilterSeries {
	slug: string
	name: string
	count: number
}

/**
 * Filtering by series, as links rather than client state.
 *
 * The reference site uses dropdowns, but with three series a row of links is
 * fewer clicks and it gives every filtered view its own URL — which matters
 * here, because "the Gold ones" is a page a dealer will want to send someone.
 */
export function SeriesFilter({
	series,
	active,
	total,
}: {
	series: FilterSeries[]
	active?: string
	total: number
}) {
	const base = "display px-4 py-2 text-xs uppercase transition-colors"

	return (
		<div className="border-rule flex flex-wrap items-center gap-x-6 gap-y-3 border-y py-4">
			<span className="display text-muted-foreground text-xs uppercase">Filter by</span>
			<div className="flex flex-wrap gap-2">
				<Link
					href="/products"
					className={cn(
						base,
						!active ? "bg-ink text-paper" : "border-rule text-ink border hover:bg-band",
					)}
				>
					All ({total})
				</Link>
				{series.map((item) => (
					<Link
						key={item.slug}
						href={`/products?series=${item.slug}`}
						className={cn(
							base,
							active === item.slug
								? "bg-ink text-paper"
								: "border-rule text-ink border hover:bg-band",
						)}
					>
						{item.name} ({item.count})
					</Link>
				))}
			</div>
		</div>
	)
}
