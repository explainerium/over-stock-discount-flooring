import { PlusIcon, UsersIcon } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { requireStaff } from "@/server/auth/guards"
import { listDealers } from "@/server/repositories/dealers"
import { DealerStatusBadge } from "./_components/DealerStatusBadge"

export const metadata = { title: "Dealers" }

export default async function DealersPage({
	searchParams,
}: {
	searchParams: Promise<{ q?: string }>
}) {
	await requireStaff()
	const { q } = await searchParams
	const dealers = await listDealers(q)

	return (
		<div className="grid gap-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-xl font-semibold tracking-wide uppercase">Dealers</h1>
					<p className="text-muted-foreground text-sm">
						{dealers.length} {dealers.length === 1 ? "account" : "accounts"}
					</p>
				</div>
				<Button asChild>
					<Link href="/admin/dealers/new">
						<PlusIcon aria-hidden />
						Add dealer
					</Link>
				</Button>
			</div>

			{dealers.length === 0 ? (
				<Card>
					<CardContent className="text-muted-foreground py-10 text-center text-sm">
						{q ? (
							<>No dealer matches “{q}”.</>
						) : (
							<>
								No dealers yet. Add one, then send them an invitation to set up
								their own sign-in.
							</>
						)}
					</CardContent>
				</Card>
			) : (
				/* A list of rows rather than a table: it reads the same on a phone as
				   on a desktop, and the owner is as likely to be on one as the other. */
				<ul className="grid gap-2">
					{dealers.map((dealer) => (
						<li key={dealer.id}>
							<Link
								href={`/admin/dealers/${dealer.id}`}
								className="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 transition-colors"
							>
								<div className="min-w-0">
									<p className="truncate font-medium">{dealer.companyName}</p>
									<p className="text-muted-foreground truncate text-sm">
										{dealer.contactName ??
											dealer.contactEmail ??
											"No contact on file"}
									</p>
								</div>
								<div className="flex items-center gap-3">
									<span className="text-muted-foreground flex items-center gap-1 text-sm">
										<UsersIcon className="size-3.5" aria-hidden />
										{dealer._count.users}
									</span>
									<DealerStatusBadge status={dealer.status} />
								</div>
							</Link>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}
