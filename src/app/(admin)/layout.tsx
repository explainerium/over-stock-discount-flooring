import type { Metadata } from "next"
import type { ReactNode } from "react"
import { SignOutButton } from "@/components/shared/SignOutButton"
import { requireStaff } from "@/server/auth/guards"

export const metadata: Metadata = { robots: { index: false, follow: false } }

/**
 * Admin shell.
 *
 * The guard runs in the layout so every page beneath it is covered by default
 * — a new screen added under /admin is protected because of where it sits, not
 * because someone remembered to add a check.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
	const user = await requireStaff()

	return (
		<div className="flex min-h-svh flex-col">
			<header className="flex items-center justify-between border-b px-4 py-3">
				<div>
					<p className="text-sm font-semibold tracking-[0.2em] uppercase">Admin</p>
					<p className="text-muted-foreground text-xs">
						{user.email} · {user.role}
					</p>
				</div>
				<SignOutButton />
			</header>
			<main className="flex-1 p-4">{children}</main>
		</div>
	)
}
