import Link from "next/link"
import { SHOWROOM } from "@/constants/catalog"

const COLUMNS = [
	{
		heading: "Catalog",
		links: [
			{ href: "/products?series=bronze", label: "Bronze Series" },
			{ href: "/products?series=silver", label: "Silver Series" },
			{ href: "/products?series=gold", label: "Gold Series" },
			{ href: "/products?series=accessories", label: "Trim & Mouldings" },
		],
	},
	{
		heading: "Resources",
		links: [
			{ href: "/rigid-core", label: "What is rigid core?" },
			{ href: "/resources/coverage-calculator", label: "Coverage calculator" },
			{ href: "/resources", label: "Warranties & guides" },
		],
	},
	{
		heading: "Trade",
		links: [
			{ href: "/become-a-dealer", label: "Become a dealer" },
			{ href: "/login", label: "Dealer login" },
			{ href: "/dealers", label: "Find a dealer" },
		],
	},
]

export function SiteFooter() {
	return (
		<footer className="bg-ink text-paper">
			<div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]">
				<div>
					<p className="display text-xl">
						Overstock
						<span className="mt-1 block text-[0.55rem] font-normal tracking-[0.3em] opacity-60">
							Discount Flooring
						</span>
					</p>
					<address className="display mt-6 text-xs leading-relaxed not-italic opacity-70">
						{SHOWROOM.street}
						<br />
						{SHOWROOM.city}, {SHOWROOM.state} {SHOWROOM.zip}
						<br />
						<a href={SHOWROOM.phoneHref} className="hover:opacity-100">
							{SHOWROOM.phone}
						</a>
					</address>
				</div>

				{COLUMNS.map((column) => (
					<nav key={column.heading}>
						<h2 className="display text-xs uppercase opacity-55">
							{column.heading}
						</h2>
						<ul className="mt-4 grid gap-2">
							{column.links.map((link) => (
								<li key={link.href}>
									<Link
										href={link.href}
										className="text-sm opacity-80 transition-opacity hover:opacity-100"
									>
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</nav>
				))}
			</div>

			<div className="border-white/10 mx-auto flex max-w-[1280px] flex-wrap justify-between gap-3 border-t px-5 py-6">
				<p className="display text-[0.65rem] opacity-50">
					© {new Date().getFullYear()} Overstock Discount Flooring
				</p>
				<div className="display flex gap-5 text-[0.65rem] opacity-50">
					<Link href="/privacy">Privacy</Link>
					<Link href="/terms">Terms</Link>
				</div>
			</div>
		</footer>
	)
}
