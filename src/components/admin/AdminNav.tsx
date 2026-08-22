"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

/**
 * Admin navigation.
 *
 * A horizontal bar rather than a sidebar, and it stays that way on small
 * screens. The owner runs this business in person and reaches for the phone in
 * his pocket, so the admin has to be usable standing up — a collapsing sidebar
 * behind a hamburger is one tap further away from everything.
 */
const LINKS = [
	{ href: "/admin", label: "Overview", exact: true },
	{ href: "/admin/dealers", label: "Dealers" },
]

export function AdminNav() {
	const pathname = usePathname()

	return (
		<nav className="-mx-1 flex gap-1 overflow-x-auto" aria-label="Admin">
			{LINKS.map((link) => {
				const active = link.exact ? pathname === link.href : pathname.startsWith(link.href)
				return (
					<Link
						key={link.href}
						href={link.href}
						aria-current={active ? "page" : undefined}
						className={cn(
							"rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
							active
								? "bg-foreground text-background"
								: "text-muted-foreground hover:bg-muted hover:text-foreground",
						)}
					>
						{link.label}
					</Link>
				)
			})}
		</nav>
	)
}
