import Link from "next/link"
import { cn } from "@/lib/utils"

export interface FilterItem {
	slug: string
	name: string
	count: number
	href: string
}

/**
 * One row of catalog filters — categories, or the series inside one — as
 * links rather than client state.
 *
 * Links give every filtered view its own URL, which matters here: "the trim"
 * or "the AR series" is a page a dealer will want to send someone.
 */
export function FilterLinks({
	label,
	items,
	active,
	all,
}: {
	label: string
	items: FilterItem[]
	active?: string
	/** The "everything" link that starts the row, with its count. */
	all: { label: string; href: string; count: number }
}) {
	const base = "display px-4 py-2 text-xs uppercase transition-colors"
	const on = "bg-ink text-paper"
	const off = "border-rule text-ink border hover:bg-band"

	return (
		<div className="flex flex-wrap items-center gap-x-6 gap-y-3">
			<span className="display text-muted-foreground w-20 text-xs uppercase">{label}</span>
			<div className="flex flex-wrap gap-2">
				<Link
					href={all.href}
					aria-current={!active ? "page" : undefined}
					className={cn(base, !active ? on : off)}
				>
					{all.label} ({all.count})
				</Link>
				{items.map((item) => (
					<Link
						key={item.slug}
						href={item.href}
						aria-current={active === item.slug ? "page" : undefined}
						className={cn(base, active === item.slug ? on : off)}
					>
						{item.name} ({item.count})
					</Link>
				))}
			</div>
		</div>
	)
}
