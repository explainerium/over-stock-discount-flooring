import { ArrowRightIcon } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { agoLabel, isOverdue, waitingFor } from "@/lib/format/elapsed"
import { formatMoney } from "@/lib/format/money"
import { requireStaff } from "@/server/auth/guards"
import { getDashboard } from "@/server/repositories/dashboard"
import { NeedsAttention, type AttentionItem } from "./_components/NeedsAttention"

export const metadata = { title: "Overview" }

const LEAD_SOURCE: Record<string, string> = {
	CONTACT_FORM: "Contact form",
	COVERAGE_CALCULATOR: "Coverage calculator",
	SAMPLE_REQUEST: "Sample request",
	DEALER_APPLICATION: "Dealer application",
}

function plural(count: number, one: string, many: string) {
	return count === 1 ? one : many
}

/**
 * The owner's first screen.
 *
 * Built around one question — what needs me today — rather than around counts.
 * A dashboard of totals looks busy and tells him nothing he can act on; the
 * orders waiting for a decision are the reason he opened the site, so they are
 * the first thing on it and they are tappable rather than merely counted.
 *
 * One column on a phone, which is where the plan says this screen actually
 * gets used.
 */
export default async function AdminHome() {
	await requireStaff()
	const { awaiting, noAddress, pending, noPrice, noFreightData, unhandledLeads, recentLeads } =
		await getDashboard()

	// Computed once, on the server, so every row on the page is measured from
	// the same moment rather than from whenever each one rendered.
	const now = new Date()

	const attention: AttentionItem[] = [
		...noAddress.map((dealer) => ({
			blocking: true,
			href: `/admin/dealers/${dealer.id}`,
			body: (
				<>
					<span className="text-foreground">{dealer.companyName}</span> has no delivery
					address, so they cannot submit an order.
				</>
			),
		})),
		...(noPrice.length > 0
			? [
					{
						blocking: true,
						href: "/admin/products",
						body: (
							<>
								<span className="text-foreground">{noPrice.length}</span>{" "}
								{plural(noPrice.length, "product has", "products have")} no price
								set, so {plural(noPrice.length, "it cannot", "they cannot")} be
								ordered.
							</>
						),
					},
				]
			: []),
		...(noFreightData.length > 0
			? [
					{
						blocking: false,
						href: "/admin/series",
						body: (
							<>
								<span className="text-foreground">{noFreightData.length}</span>{" "}
								{plural(noFreightData.length, "series has", "series have")} no
								freight class or NMFC code. Needed before freight can be rated
								automatically.
							</>
						),
					},
				]
			: []),
		...(pending.length > 0
			? [
					{
						blocking: false,
						href: "/admin/dealers",
						body: (
							<>
								<span className="text-foreground">{pending.length}</span>{" "}
								{plural(pending.length, "dealer was", "dealers were")} invited but
								never activated.
							</>
						),
					},
				]
			: []),
	]

	return (
		<div className="grid gap-6">
			<Card>
				<CardHeader className="flex flex-wrap items-center justify-between gap-2">
					<CardTitle className="text-base">
						{awaiting.length === 0
							? "No orders waiting"
							: `${awaiting.length} ${plural(awaiting.length, "order waits", "orders wait")} on you`}
					</CardTitle>
					{awaiting.length > 0 && (
						<Link
							href="/admin/orders"
							className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
						>
							All orders
							<ArrowRightIcon className="size-4" aria-hidden />
						</Link>
					)}
				</CardHeader>
				<CardContent>
					{awaiting.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Every submitted order has been answered.{" "}
							<Link href="/admin/orders" className="underline underline-offset-4">
								Order history
							</Link>
						</p>
					) : (
						<ul className="grid gap-2">
							{awaiting.map((order) => {
								const since = order.submittedAt ?? now
								return (
									<li key={order.id}>
										<Link
											href={`/admin/orders/${order.id}`}
											className="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 transition-colors"
										>
											<div className="min-w-0">
												<p className="truncate font-medium">
													#{order.orderNumber} ·{" "}
													{order.dealer.companyName}
												</p>
												<p className="text-muted-foreground text-xs">
													{order._count.items}{" "}
													{plural(order._count.items, "line", "lines")} ·
													waiting {waitingFor(since, now)}
													{isOverdue(since, now) && (
														<span className="text-foreground">
															{" "}
															· overdue
														</span>
													)}
													{Number(order.freight) === 0 && " · no freight"}
												</p>
											</div>
											<span className="font-medium">
												{formatMoney(order.total.toString())}
											</span>
										</Link>
									</li>
								)
							})}
						</ul>
					)}
				</CardContent>
			</Card>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Needs attention</CardTitle>
					</CardHeader>
					<CardContent>
						<NeedsAttention items={attention} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-wrap items-center justify-between gap-2">
						<CardTitle className="text-base">
							{unhandledLeads === 0
								? "No new enquiries"
								: `${unhandledLeads} new ${plural(unhandledLeads, "enquiry", "enquiries")}`}
						</CardTitle>
						{unhandledLeads > 0 && (
							<Link
								href="/admin/leads"
								className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
							>
								Lead inbox
								<ArrowRightIcon className="size-4" aria-hidden />
							</Link>
						)}
					</CardHeader>
					<CardContent>
						{recentLeads.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								Nothing unanswered from the public site.
							</p>
						) : (
							<ul className="grid gap-3">
								{recentLeads.map((lead) => (
									<li key={lead.id} className="text-sm">
										<Link href="/admin/leads" className="hover:underline">
											<span className="font-medium">
												{lead.company || lead.name || "Someone"}
											</span>
											<span className="text-muted-foreground">
												{" · "}
												{LEAD_SOURCE[lead.source] ?? lead.source} ·{" "}
												{agoLabel(lead.createdAt, now)}
											</span>
										</Link>
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
