"use client"

import { MapPinIcon, PhoneIcon, SearchIcon, SquareStackIcon, UserIcon, XIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { SHOWROOM } from "@/constants/catalog"

/**
 * Header, built to the reference site's structure.
 *
 * Three bands stacked: a black announcement strip that can be dismissed, then a
 * white bar with the mark on the left, a small utility row of icon links on the
 * right, and the main navigation sitting underneath it — right-aligned rather
 * than centred, which is what that site does.
 *
 * Two details worth keeping exactly: the utility row is 12px, semibold, upper
 * case; the main nav is 16px, bold, and NOT uppercased. Setting both in caps —
 * which an earlier pass here did — loses the hierarchy between them.
 */

const UTILITY = [
	{ href: "/products", label: "Search", Icon: SearchIcon },
	{ href: "/dealers", label: "Find a Dealer", Icon: MapPinIcon },
	{ href: "/products", label: "Samples", Icon: SquareStackIcon },
	{ href: "/login", label: "Dealer Login", Icon: UserIcon },
]

const NAV = [
	{ href: "/products", label: "Catalog" },
	{ href: "/rigid-core", label: "Rigid Core" },
	{ href: "/resources", label: "Resources" },
	{ href: "/about", label: "Company" },
	{ href: "/contact", label: "Contact" },
]

export function SiteHeader() {
	const [announced, setAnnounced] = useState(true)

	return (
		<header className="bg-paper sticky top-0 z-40">
			{announced && (
				<div className="relative bg-black px-10 py-2.5 text-center">
					<p className="text-[0.8rem] text-white">
						Open to the public — {SHOWROOM.weekdays}, {SHOWROOM.saturday}. Walk in and
						see every colour we stock.
					</p>
					<button
						type="button"
						onClick={() => setAnnounced(false)}
						aria-label="Dismiss announcement"
						className="absolute top-1/2 right-4 -translate-y-1/2 text-white/70 transition-colors hover:text-white"
					>
						<XIcon className="size-4" aria-hidden />
					</button>
				</div>
			)}

			<div className="border-rule border-b">
				<div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-8 gap-y-4 px-5 py-4">
					<Link href="/" className="shrink-0">
						<span className="display border-ink block border-2 px-3 py-1 text-lg leading-none">
							ODF
						</span>
						<span className="display text-ink mt-1.5 block text-[0.6rem] font-semibold tracking-[0.2em]">
							OVERSTOCK
						</span>
					</Link>

					<div className="ml-auto flex flex-col items-end gap-3">
						<nav
							aria-label="Utility"
							className="flex flex-wrap justify-end gap-x-6 gap-y-2"
						>
							{UTILITY.map(({ href, label, Icon }) => (
								<Link
									key={label}
									href={href}
									className="display text-ink flex items-center gap-1.5 text-xs font-semibold uppercase transition-opacity hover:opacity-70"
								>
									<Icon className="size-4" aria-hidden />
									{label}
								</Link>
							))}
							<a
								href={SHOWROOM.phoneHref}
								className="display text-ink flex items-center gap-1.5 text-xs font-semibold uppercase transition-opacity hover:opacity-70"
							>
								<PhoneIcon className="size-4" aria-hidden />
								{SHOWROOM.phone}
							</a>
						</nav>

						<nav aria-label="Main" className="-mx-1 flex gap-7 overflow-x-auto px-1">
							{NAV.map((item) => (
								<Link
									key={item.href}
									href={item.href}
									className="display text-ink text-base font-bold whitespace-nowrap transition-opacity hover:opacity-70"
								>
									{item.label}
								</Link>
							))}
						</nav>
					</div>
				</div>
			</div>
		</header>
	)
}
