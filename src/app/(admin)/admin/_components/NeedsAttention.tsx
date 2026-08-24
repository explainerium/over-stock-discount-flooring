import { AlertTriangleIcon, CheckIcon } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

export interface AttentionItem {
	/** Something a dealer is blocked by right now. */
	blocking: boolean
	href: string
	body: ReactNode
}

/**
 * The things that go wrong quietly.
 *
 * Every item here is a state the system will not complain about on its own —
 * an order that cannot be submitted, a product that cannot be priced, a series
 * that cannot be rated. Each one surfaces as a phone call weeks later if it is
 * not put in front of the owner now.
 *
 * Blocking items are marked; the rest are listed plainly. Making all of them
 * shout would teach him to ignore the section.
 */
export function NeedsAttention({ items }: { items: AttentionItem[] }) {
	if (items.length === 0) {
		return (
			<p className="text-muted-foreground flex items-center gap-2 text-sm">
				<CheckIcon className="size-4 shrink-0" aria-hidden />
				Nothing waiting on you.
			</p>
		)
	}

	const sorted = [...items].sort((a, b) => Number(b.blocking) - Number(a.blocking))

	return (
		<ul className="grid gap-3">
			{sorted.map((item, index) => (
				<li key={index}>
					<Link
						href={item.href}
						className="hover:text-foreground text-muted-foreground flex items-start gap-2 text-sm transition-colors"
					>
						{item.blocking ? (
							<AlertTriangleIcon
								className="text-foreground mt-0.5 size-4 shrink-0"
								aria-hidden
							/>
						) : (
							<span className="bg-muted-foreground/40 mt-1.5 size-1.5 shrink-0 rounded-full" />
						)}
						<span>{item.body}</span>
					</Link>
				</li>
			))}
		</ul>
	)
}
