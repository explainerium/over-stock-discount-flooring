"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const LINKS = [
	{ href: "/portal", label: "Overview", exact: true },
	{ href: "/portal/catalog", label: "Catalog" },
	{ href: "/portal/cart", label: "Your Order" },
	{ href: "/portal/orders", label: "History" },
	{ href: "/portal/addresses", label: "Addresses" },
	{ href: "/portal/account", label: "Account" },
]

export function PortalNav({ lineCount }: { lineCount: number }) {
	const pathname = usePathname()

	return (
		<nav className="-mx-1 flex gap-1 overflow-x-auto" aria-label="Portal">
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
						{link.href === "/portal/cart" && lineCount > 0 && (
							<span
								className={cn(
									"ml-2 rounded-full px-1.5 py-0.5 text-xs",
									active ? "bg-background text-foreground" : "bg-muted",
								)}
							>
								{lineCount}
							</span>
						)}
					</Link>
				)
			})}
		</nav>
	)
}
