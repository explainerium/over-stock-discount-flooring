import { ArrowLeftIcon } from "lucide-react"
import { formatTerms } from "@/lib/format/terms"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireStaff } from "@/server/auth/guards"
import { listAllAddresses } from "@/server/repositories/addresses"
import { getDealer } from "@/server/repositories/dealers"
import { DealerStatusBadge } from "../_components/DealerStatusBadge"
import { DealerAddresses } from "./_components/DealerAddresses"
import { DealerStatusActions } from "./_components/DealerStatusActions"
import { InviteUserForm } from "./_components/InviteUserForm"
import { RevokeInviteButton } from "./_components/RevokeInviteButton"

export default async function DealerDetailPage({ params }: { params: Promise<{ id: string }> }) {
	await requireStaff()
	const { id } = await params

	const dealer = await getDealer(id)
	if (!dealer) notFound()

	const addresses = await listAllAddresses(dealer.id)

	const activeUsers = dealer.users.filter((user) => user.status === "ACTIVE").length

	return (
		<div className="grid max-w-4xl gap-6">
			<Link
				href="/admin/dealers"
				className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
			>
				<ArrowLeftIcon className="size-4" aria-hidden />
				Dealers
			</Link>

			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-xl font-semibold tracking-wide uppercase">
						{dealer.companyName}
					</h1>
					<div className="mt-2 flex items-center gap-2">
						<DealerStatusBadge status={dealer.status} />
						{dealer.taxExempt && <Badge variant="outline">Resale exempt</Badge>}
					</div>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" asChild>
						<Link href={`/admin/dealers/${dealer.id}/pricing`}>Pricing</Link>
					</Button>
					<DealerStatusActions
						dealerId={dealer.id}
						status={dealer.status}
						activeUsers={activeUsers}
					/>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Contact</CardTitle>
				</CardHeader>
				<CardContent className="text-sm">
					<dl className="grid gap-y-2 sm:grid-cols-[10rem_1fr]">
						<dt className="text-muted-foreground">Contact name</dt>
						<dd>{dealer.contactName ?? "—"}</dd>
						<dt className="text-muted-foreground">Email</dt>
						<dd>{dealer.contactEmail ?? "—"}</dd>
						<dt className="text-muted-foreground">Phone</dt>
						<dd>{dealer.contactPhone ?? "—"}</dd>
						<dt className="text-muted-foreground">Payment terms</dt>
						<dd>{formatTerms(dealer.paymentTerms)}</dd>
						<dt className="text-muted-foreground">Freight</dt>
						<dd>{dealer.freightMode}</dd>
					</dl>
					{dealer.notes && (
						<p className="text-muted-foreground mt-4 border-t pt-4 whitespace-pre-wrap">
							{dealer.notes}
						</p>
					)}
				</CardContent>
			</Card>

			<DealerAddresses addresses={addresses} />

			<Card>
				<CardHeader>
					<CardTitle>People</CardTitle>
					<CardDescription>
						Anyone here can sign in and place orders for {dealer.companyName}.
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4">
					{dealer.users.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Nobody has accepted an invitation yet.
						</p>
					) : (
						<ul className="grid gap-2">
							{dealer.users.map((user) => (
								<li
									key={user.id}
									className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
								>
									<div className="min-w-0">
										<p className="truncate text-sm font-medium">
											{user.firstName
												? `${user.firstName} ${user.lastName ?? ""}`.trim()
												: user.email}
										</p>
										<p className="text-muted-foreground truncate text-xs">
											{user.email}
											{user.lastLoginAt &&
												` · last signed in ${user.lastLoginAt.toLocaleDateString("en-US")}`}
										</p>
									</div>
									<Badge
										variant={user.status === "ACTIVE" ? "default" : "secondary"}
									>
										{user.status === "ACTIVE" ? "Active" : "Invited"}
									</Badge>
								</li>
							))}
						</ul>
					)}

					<div className="border-t pt-4">
						<InviteUserForm dealerId={dealer.id} />
					</div>
				</CardContent>
			</Card>

			{dealer.invites.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Invitations outstanding</CardTitle>
						<CardDescription>
							Sent but not yet accepted. The links themselves are not stored, so a
							lost one has to be reissued.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ul className="grid gap-2">
							{dealer.invites.map((invite) => (
								<li
									key={invite.id}
									className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
								>
									<div className="min-w-0">
										<p className="truncate text-sm">{invite.email}</p>
										<p className="text-muted-foreground text-xs">
											Expires {invite.expiresAt.toLocaleDateString("en-US")}
										</p>
									</div>
									<RevokeInviteButton inviteId={invite.id} />
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
