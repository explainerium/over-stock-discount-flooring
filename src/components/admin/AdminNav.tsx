"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ScrollableNav } from "@/components/shared/ScrollableNav"
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
	{ href: "/admin/orders", label: "Orders" },
	{ href: "/admin/dealers", label: "Dealers" },
	{ href: "/admin/products", label: "Products" },
	{ href: "/admin/categories", label: "Categories" },
	{ href: "/admin/series", label: "Series" },
	{ href: "/admin/leads", label: "Leads" },
	{ href: "/admin/freight", label: "Freight" },
	{ href: "/admin/settings", label: "Settings" },
]

/**
 * @param awaiting how many orders are sitting unanswered. Shown on the tab
 * rather than only on the page, because an order the owner has not opened is
 * exactly the one he needs telling about.
 */
export function AdminNav({ awaiting = 0 }: { awaiting?: number }) {
	const pathname = usePathname()

	return (
		<ScrollableNav label="Admin" activeKey={pathname}>
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
						{link.href === "/admin/orders" && awaiting > 0 && (
							<span
								className={cn(
									"ml-1.5 rounded-full px-1.5 py-0.5 text-xs tabular-nums",
									active ? "bg-background/20" : "bg-foreground text-background",
								)}
							>
								{awaiting}
							</span>
						)}
					</Link>
				)
			})}
		</ScrollableNav>
	)
}
