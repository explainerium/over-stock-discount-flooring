import type { Metadata } from "next"
import type { ReactNode } from "react"
import { SignOutButton } from "@/components/shared/SignOutButton"
import { requireDealerScope } from "@/server/auth/guards"

export const metadata: Metadata = { robots: { index: false, follow: false } }

/**
 * Dealer portal shell.
 *
 * Resolving the scope here means a page below can take `dealerId` as given.
 * Staff are rejected rather than shown a dealer view — an admin looking at a
 * dealer's orders does it from /admin with that dealer named explicitly, so the
 * privileged path stays visible in the code.
 */
export default async function PortalLayout({ children }: { children: ReactNode }) {
	const { user } = await requireDealerScope()

	return (
		<div className="flex min-h-svh flex-col">
			<header className="flex items-center justify-between border-b px-4 py-3">
				<div>
					<p className="text-sm font-semibold tracking-[0.2em] uppercase">
						{user.dealerName ?? "Dealer Portal"}
					</p>
					<p className="text-muted-foreground text-xs">{user.email}</p>
				</div>
				<SignOutButton />
			</header>
			<main className="flex-1 p-4">{children}</main>
		</div>
	)
}
