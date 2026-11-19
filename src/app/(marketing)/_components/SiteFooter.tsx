import Link from "next/link"
import { FacebookIcon } from "@/components/shared/FacebookIcon"
import { FACEBOOK_URL, SHOWROOM } from "@/constants/catalog"
import { listPublicCategories } from "@/server/repositories/catalog"

/**
 * The columns that do not depend on the catalog. The Catalog column is built
 * from the categories in the database instead — it used to list Bronze, Silver
 * and Gold by hand,
 * which meant the footer kept pointing at series the client had renamed or
 * retired, on every page of the site.
 */
const COLUMNS = [
	{
		heading: "Resources",
		links: [
			{ href: "/rigid-core", label: "What is rigid core?" },
			{ href: "/resources#coverage-calculator", label: "Coverage calculator" },
			{ href: "/resources", label: "Warranties & guides" },
		],
	},
	{
		heading: "Trade",
		links: [
			{ href: "/become-a-dealer", label: "Apply for a Dealer / Contractor Account" },
			{ href: "/login", label: "Dealer / Contractor Log In" },
		],
	},
]

export async function SiteFooter() {
	const categories = await listPublicCategories()

	const columns = [
		{
			heading: "Catalog",
			links: categories.map((item) => ({
				href: `/products?category=${item.slug}`,
				label: item.name,
			})),
		},
		...COLUMNS,
	]

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
					{/* A 44px target around a 20px glyph, like every other tap target here. */}
					<a
						href={FACEBOOK_URL}
						target="_blank"
						rel="noopener noreferrer"
						aria-label="Overstock Discount Flooring on Facebook"
						className="-ml-3 mt-3 inline-flex size-11 items-center justify-center opacity-70 transition-opacity hover:opacity-100"
					>
						<FacebookIcon className="size-5" />
					</a>
				</div>

				{columns.map((column) => (
					<nav key={column.heading}>
						<h2 className="display text-xs uppercase opacity-55">{column.heading}</h2>
						{/* The 8px that used to be a gap is padding on the links
						    instead. Same rhythm, but each row is a 27px tap target with
						    no dead strip between them — these are 19px of text on a
						    phone, and they are the secondary nav for the whole site. */}
						<ul className="mt-3 grid">
							{column.links.map((link) => (
								<li key={link.href}>
									<Link
										href={link.href}
										className="block py-1 text-sm opacity-80 transition-opacity hover:opacity-100"
									>
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</nav>
				))}
			</div>

			{/* Privacy and Terms used to sit on the right of this bar, pointing at
			    /privacy and /terms. Neither page has ever existed, so both 404ed
			    from the footer of every page on the site. The old site has no
			    legal pages either — its whole route map is ten pages and none of
			    them is one, and every candidate URL on it 404s — so there is no
			    copy to recover. Left out until the client supplies the text; the
			    links go back the moment there is something behind them. */}
			<div className="border-white/10 mx-auto flex max-w-[1280px] flex-wrap justify-between gap-3 border-t px-5 py-6">
				<p className="display text-[0.65rem] opacity-50">
					© {new Date().getFullYear()} Overstock Discount Flooring
				</p>
			</div>
		</footer>
	)
}
