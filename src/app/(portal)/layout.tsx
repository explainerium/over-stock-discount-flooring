import type { Metadata } from "next"
import type { ReactNode } from "react"
import { PortalNav } from "@/components/portal/PortalNav"
import { SignOutButton } from "@/components/shared/SignOutButton"
import { Toaster } from "@/components/ui/sonner"
import { requireDealerScope } from "@/server/auth/guards"
import { countDraftLines } from "@/server/repositories/orders"

export const metadata: Metadata = { robots: { index: false, follow: false } }

/**
 * Dealer portal shell.
 *
 * Resolving the scope here means every page below can take `dealerId` as given.
 * Staff are redirected to /admin rather than shown a dealer view — an owner
 * looking at a dealer's orders does it from admin with that dealer named, which
 * keeps the privileged path visible in the code instead of implied.
 */
export default async function PortalLayout({ children }: { children: ReactNode }) {
	const { user, dealerId } = await requireDealerScope()
	const lineCount = await countDraftLines(dealerId)

	return (
		<div className="flex min-h-svh flex-col">
			<header className="bg-background sticky top-0 z-10 border-b">
				<div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
					<div>
						<p className="text-sm font-semibold tracking-[0.2em] uppercase">
							{user.dealerName ?? "Dealer Portal"}
						</p>
						<p className="text-muted-foreground text-xs">{user.email}</p>
					</div>
					<SignOutButton />
					<div className="w-full">
						<PortalNav lineCount={lineCount} />
					</div>
				</div>
			</header>

			<main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
			<Toaster position="top-center" />
		</div>
	)
}
