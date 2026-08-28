"use client"

import {
	MapPinIcon,
	MenuIcon,
	PhoneIcon,
	SearchIcon,
	SquareStackIcon,
	UserIcon,
	XIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet"
import { SHOWROOM } from "@/constants/catalog"
import { cn } from "@/lib/utils"

/**
 * Header, built to the reference site's structure.
 *
 * Two rows, both left-aligned against the same 1280px column: a thin utility
 * row of icon links, then the main navigation. The reference site puts the
 * logo on the left spanning both rows, so that is what this does — the mark
 * sits in its own column and the two rows stack beside it.
 *
 * Two details worth keeping exactly: the utility row is 12px, semibold, upper
 * case; the main nav is 16px, bold, and NOT uppercased. Setting both in caps —
 * which an earlier pass here did — loses the hierarchy between them.
 *
 * A phone gets a different arrangement rather than a squeezed version of the
 * same one. Everything except the phone number moves behind a menu button.
 * The previous pass here scrolled the nav sideways instead, which measured
 * badly: 170px of it sat off-screen, so Company and Contact were invisible
 * unless you thought to swipe a row that gives no sign it can be swiped, and
 * three of the four utility links were dropped from the phone entirely. That
 * included Samples, which the audit calls out as how a flooring buyer actually
 * decides. A menu costs one tap and reaches all nine.
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

/**
 * The phone number, which stays out of the menu at every width.
 *
 * This is a shop with a counter, and ringing it is a real action rather than a
 * navigation — burying it one tap deep on the device that can actually place
 * the call would be the wrong trade.
 */
function PhoneLink({ className }: { className?: string }) {
	return (
		<a
			href={SHOWROOM.phoneHref}
			className={cn(
				"display text-ink flex items-center gap-1.5 text-xs font-semibold uppercase transition-opacity hover:opacity-70",
				className,
			)}
		>
			<PhoneIcon className="size-4" aria-hidden />
			{SHOWROOM.phone}
		</a>
	)
}

/**
 * The phone menu.
 *
 * Radix keeps the sheet mounted across a client-side navigation, so a link
 * inside it would otherwise leave the panel sitting open over the page it just
 * moved to. Every link is wrapped in SheetClose for that, and the route check
 * below covers the one way out that does not go through a link.
 */
function MobileMenu() {
	const [open, setOpen] = useState(false)
	const pathname = usePathname()
	const [lastPath, setLastPath] = useState(pathname)

	// Adjusted during render rather than in an effect. Every link already sits
	// inside a SheetClose, so this is only reached when the route changed
	// without one being tapped — the browser's own back button, which would
	// otherwise leave the panel open over the page behind it.
	if (pathname !== lastPath) {
		setLastPath(pathname)
		setOpen(false)
	}

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger
				className="text-ink -mr-2.5 flex size-11 items-center justify-center transition-opacity hover:opacity-70 sm:hidden"
				aria-label="Open menu"
			>
				<MenuIcon className="size-6" aria-hidden />
			</SheetTrigger>

			<SheetContent side="right" className="bg-paper w-[86%] gap-0 px-0 sm:max-w-sm">
				<SheetTitle className="display border-rule text-ink border-b px-6 pt-1 pb-4 text-sm font-semibold tracking-[0.2em] uppercase">
					Menu
				</SheetTitle>
				<SheetDescription className="sr-only">
					Site navigation and dealer tools
				</SheetDescription>

				<nav aria-label="Main" className="border-rule grid border-b py-2">
					{NAV.map((item) => (
						<SheetClose asChild key={item.href}>
							<Link
								href={item.href}
								className="display text-ink hover:bg-band px-6 py-3 text-lg font-bold transition-colors"
							>
								{item.label}
							</Link>
						</SheetClose>
					))}
				</nav>

				<nav aria-label="Utility" className="grid py-2">
					{UTILITY.map(({ href, label, Icon }) => (
						<SheetClose asChild key={label}>
							<Link
								href={href}
								className="display text-ink hover:bg-band flex items-center gap-3 px-6 py-3 text-xs font-semibold uppercase transition-colors"
							>
								<Icon className="size-4 shrink-0" aria-hidden />
								{label}
							</Link>
						</SheetClose>
					))}
				</nav>

				<div className="border-rule mt-auto border-t px-6 py-5">
					<PhoneLink className="text-sm" />
					<p className="text-muted-foreground mt-2 text-xs">
						{SHOWROOM.street}, {SHOWROOM.city}, {SHOWROOM.state} {SHOWROOM.zip}
					</p>
					<p className="text-muted-foreground text-xs">
						{SHOWROOM.weekdays} · {SHOWROOM.saturday}
					</p>
				</div>
			</SheetContent>
		</Sheet>
	)
}

export function SiteHeader() {
	const [announced, setAnnounced] = useState(true)

	return (
		<header className="bg-paper sticky top-0 z-40">
			{announced && (
				<div className="relative bg-black py-2.5 pr-14 pl-5 text-center sm:px-14">
					<p className="text-[0.8rem] text-white">
						Open to the public — {SHOWROOM.weekdays}, {SHOWROOM.saturday}. Walk in and
						see every colour we stock.
					</p>
					{/* Sized to the 44px touch target rather than to the glyph: this is
					    the control that buys back a quarter of a phone screen, and at
					    the icon's own 16px it was the hardest thing here to hit. */}
					<button
						type="button"
						onClick={() => setAnnounced(false)}
						aria-label="Dismiss announcement"
						className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center text-white/70 transition-colors hover:text-white"
					>
						<XIcon className="size-4" aria-hidden />
					</button>
				</div>
			)}

			<div className="border-rule border-b">
				<div className="mx-auto flex max-w-[1280px] items-center gap-x-8 px-5 py-4">
					<Link href="/" className="shrink-0">
						<span className="display border-ink block border-2 px-3 py-1 text-lg leading-none">
							ODF
						</span>
						<span className="display text-ink mt-1.5 block text-[0.6rem] font-semibold tracking-[0.2em]">
							OVERSTOCK
						</span>
					</Link>

					<div className="ml-auto flex min-w-0 items-center gap-4 sm:flex-col sm:items-end sm:gap-3">
						<nav
							aria-label="Utility"
							className="hidden flex-wrap justify-end gap-x-6 gap-y-2 sm:flex"
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
							<PhoneLink />
						</nav>

						<PhoneLink className="sm:hidden" />

						<nav
							aria-label="Main"
							className="hidden min-w-0 gap-7 overflow-x-auto sm:flex"
						>
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

						<MobileMenu />
					</div>
				</div>
			</div>
		</header>
	)
}
