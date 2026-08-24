import type { Metadata } from "next"
import type { ReactNode } from "react"
import { AdminNav } from "@/components/admin/AdminNav"
import { SignOutButton } from "@/components/shared/SignOutButton"
import { Toaster } from "@/components/ui/sonner"
import { requireStaff } from "@/server/auth/guards"
import { countAwaitingApproval } from "@/server/repositories/orders"

export const metadata: Metadata = { robots: { index: false, follow: false } }

/**
 * Admin shell.
 *
 * The guard runs in the layout so every page beneath it is covered by default —
 * a new screen added under /admin is protected because of where it sits, not
 * because someone remembered to add a check. The actions behind those screens
 * still guard themselves; being reachable only from here is not protection.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
	const user = await requireStaff()
	const awaiting = await countAwaitingApproval()

	return (
		<div className="flex min-h-svh flex-col">
			<header className="bg-background sticky top-0 z-10 border-b">
				<div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
					<div>
						<p className="text-sm font-semibold tracking-[0.2em] uppercase">
							Overstock Admin
						</p>
						<p className="text-muted-foreground text-xs">
							{user.email} · {user.role}
						</p>
					</div>
					<SignOutButton />
					<div className="w-full">
						<AdminNav awaiting={awaiting} />
					</div>
				</div>
			</header>

			<main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
			<Toaster position="top-center" />
		</div>
	)
}
