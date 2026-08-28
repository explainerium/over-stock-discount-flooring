import Link from "next/link"

export interface Crumb {
	href?: string
	label: string
}

/**
 * Breadcrumbs on every inner page, which is what the reference site does and
 * what the current ODF site has none of.
 *
 * The last crumb is the current page and carries no link — marked with
 * aria-current so it is announced as the location rather than read as another
 * option.
 */
export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
	return (
		<nav aria-label="Breadcrumb">
			{/* -my-1 on the row and py-1 on the links: the crumbs are 12px
			    uppercase, a 16px-tall target, and they sit at the top of every
			    inner page where a thumb lands first. */}
			<ol className="display -my-1 flex flex-wrap items-center gap-x-2 text-xs uppercase">
				{trail.map((crumb, index) => {
					const last = index === trail.length - 1
					return (
						<li key={crumb.label} className="flex items-center gap-2">
							{crumb.href && !last ? (
								<Link
									href={crumb.href}
									className="text-muted-foreground hover:text-ink py-1 transition-colors"
								>
									{crumb.label}
								</Link>
							) : (
								<span
									className={last ? "text-ink" : "text-muted-foreground"}
									aria-current={last ? "page" : undefined}
								>
									{crumb.label}
								</span>
							)}
							{!last && (
								<span className="text-muted-foreground" aria-hidden>
									/
								</span>
							)}
						</li>
					)
				})}
			</ol>
		</nav>
	)
}
