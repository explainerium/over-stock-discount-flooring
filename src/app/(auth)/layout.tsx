import Link from "next/link"
import type { ReactNode } from "react"

/**
 * Auth shell — a centred card on a plain field.
 *
 * Follows the pattern in the design reference: quiet background, one card, an
 * uppercase heading, a single primary action. Nothing here depends on the
 * marketing design being signed off, so these screens can be finished while
 * the photography question is still open.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
	return (
		<div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
			<Link
				href="/"
				className="text-lg font-semibold tracking-[0.2em] uppercase"
			>
				Overstock
				<span className="text-muted-foreground block text-[0.6rem] tracking-[0.35em]">
					Discount Flooring
				</span>
			</Link>

			<div className="w-full max-w-sm">{children}</div>

			<p className="text-muted-foreground max-w-sm text-center text-xs">
				Dealer accounts are issued by invitation. Contact us if you need access.
			</p>
		</div>
	)
}
