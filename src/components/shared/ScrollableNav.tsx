"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

/**
 * The scrolling tab strip behind the admin and portal headers.
 *
 * Both shells keep their navigation as a single horizontal row on a phone
 * rather than folding it behind a hamburger — see the note in AdminNav for
 * why. The row does not fit: measured at 390px, admin leaves 194px off the
 * right edge and the portal 181px. That is the accepted cost, but two things
 * about it were not intended.
 *
 * The first is the scrollbar. A desktop browser draws a 15px bar under the
 * tabs, inside a sticky header, and it reads as a broken layout rather than as
 * an affordance — the same judgement `.no-scrollbar` records in globals.css.
 * The tab clipped by the right edge is what people actually read as "there is
 * more", and that survives hiding the bar.
 *
 * The second is that the active tab could be one of the ones off-screen. Land
 * on Settings and the strip still showed Overview through Products, so the
 * page you were on had no visible tab at all. Scrolling it into view on every
 * navigation is what makes the row honest about where you are.
 */
export function ScrollableNav({
	label,
	className,
	children,
	/** Changes whenever the active child changes — usually the pathname. */
	activeKey,
}: {
	label: string
	className?: string
	children: React.ReactNode
	activeKey: string
}) {
	const ref = useRef<HTMLElement>(null)

	useEffect(() => {
		const active = ref.current?.querySelector('[aria-current="page"]')
		// `nearest` on both axes: this must not scroll the page itself, only
		// the strip, and only when the tab is actually out of view.
		active?.scrollIntoView({ block: "nearest", inline: "nearest" })
	}, [activeKey])

	return (
		<nav
			ref={ref}
			aria-label={label}
			className={cn("no-scrollbar -mx-1 flex min-w-0 gap-1 overflow-x-auto px-1", className)}
		>
			{children}
		</nav>
	)
}
