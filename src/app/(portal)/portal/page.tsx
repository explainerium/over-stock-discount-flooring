import { ArrowRightIcon, MapPinOffIcon, ShoppingCartIcon } from "lucide-react"
import Link from "next/link"
import { OrderStatusBadge } from "@/components/shared/OrderStatusBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { agoLabel } from "@/lib/format/elapsed"
import { formatMoney } from "@/lib/format/money"
import { dealerExplanation } from "@/server/domain/orders"
import { requireDealerScope } from "@/server/auth/guards"
import { getDealerDashboard } from "@/server/repositories/dashboard"

export const metadata = { title: "Overview" }

/**
 * The dealer's first screen.
 *
 * Built the way the owner's overview is: around what needs doing, not around
 * counts. A dealer opens this to answer one of two questions — what happened
 * to the order I sent, or where did I get to on the one I hadn't sent yet —
 * so those are the first two things on it and both are tappable.
 *
 * This replaces a stub that showed the signed-in email and the dealer id as
 * "proof the scope guard works". That was scaffolding from the auth milestone;
 * it told the dealer the one thing they already knew and leaked an internal
 * identifier onto the first screen of the product.
 *
 * One column on a phone. Dealers check an order from a warehouse floor for the
 * same reason the owner approves them from one.
 */
export default async function PortalHome() {
	const { user, dealerId } = await requireDealerScope()
	const { draft, inFlight, settled, hasAddress } = await getDealerDashboard(dealerId)

	const now = new Date()
	const draftLines = draft?._count.items ?? 0

	return (
		<div className="grid max-w-4xl gap-6">
			<div>
				<h1 className="text-xl font-semibold tracking-wide uppercase">
					{user.dealerName ?? "Your account"}
				</h1>
				<p className="text-muted-foreground text-sm">
					{inFlight.length > 0
						? `${inFlight.length} ${inFlight.length === 1 ? "order" : "orders"} in progress`
						: "Nothing in progress"}
				</p>
			</div>

			{/* An account with nowhere to ship cannot submit, and the refusal
			    otherwise arrives at the end of building a whole order. */}
			{!hasAddress && (
				<Card className="border-foreground">
					<CardContent className="flex flex-wrap items-start gap-3 py-5">
						<MapPinOffIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
						<div className="min-w-0 flex-1">
							<p className="text-sm font-medium">No delivery address on file</p>
							<p className="text-muted-foreground mt-1 text-sm">
								Freight is quoted against a destination, so an order cannot be sent
								until there is one.
							</p>
						</div>
						<Button asChild size="sm">
							<Link href="/portal/addresses">Add an address</Link>
						</Button>
					</CardContent>
				</Card>
			)}

			{/* --- The order they have not sent yet. ------------------------- */}
			<Card>
				<CardHeader className="flex flex-wrap items-center justify-between gap-2">
					<CardTitle className="text-base">
						{draftLines === 0
							? "No order started"
							: `${draftLines} ${draftLines === 1 ? "line" : "lines"} not sent yet`}
					</CardTitle>
					{draftLines > 0 && (
						<Link
							href="/portal/cart"
							className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
						>
							Your order
							<ArrowRightIcon className="size-4" aria-hidden />
						</Link>
					)}
				</CardHeader>
				<CardContent>
					{draftLines === 0 ? (
						<div className="flex flex-wrap items-center justify-between gap-4">
							<p className="text-muted-foreground text-sm">
								Your pricing is applied as you add colors.
							</p>
							<Button asChild size="sm" variant="outline">
								<Link href="/portal/catalog">Browse the catalog</Link>
							</Button>
						</div>
					) : (
						<Link
							href="/portal/cart"
							className="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 transition-colors"
						>
							<div className="flex min-w-0 items-center gap-3">
								<ShoppingCartIcon
									className="text-muted-foreground size-4 shrink-0"
									aria-hidden
								/>
								<div className="min-w-0">
									<p className="font-medium">Carry on where you left off</p>
									<p className="text-muted-foreground text-xs">
										Last changed {agoLabel(draft!.updatedAt, now)}
									</p>
								</div>
							</div>
							<span className="font-medium">
								{formatMoney(draft!.total.toString())}
							</span>
						</Link>
					)}
				</CardContent>
			</Card>

			{/* --- Orders that are with us. ---------------------------------- */}
			{inFlight.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">In progress</CardTitle>
					</CardHeader>
					<CardContent>
						<ul className="grid gap-2">
							{inFlight.map((order) => (
								<li key={order.id}>
									<Link
										href={`/portal/orders/${order.id}`}
										className="hover:bg-muted/50 grid gap-2 rounded-lg border p-4 transition-colors"
									>
										<div className="flex flex-wrap items-center justify-between gap-3">
											<div className="min-w-0">
												<p className="truncate font-medium">
													Order #{order.orderNumber}
												</p>
												<p className="text-muted-foreground text-xs">
													{order._count.items}{" "}
													{order._count.items === 1 ? "line" : "lines"} ·{" "}
													{agoLabel(
														order.submittedAt ?? order.createdAt,
														now,
													)}
												</p>
											</div>
											<div className="flex items-center gap-3">
												<span className="font-medium">
													{formatMoney(order.total.toString())}
												</span>
												<OrderStatusBadge status={order.status} />
											</div>
										</div>
										{/* The status word alone does not say whose move it
										    is. CHANGES_REQUESTED in particular is the
										    dealer's, and reads like ours without this. */}
										<p className="text-muted-foreground text-sm">
											{dealerExplanation(order.status)}
										</p>
									</Link>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			)}

			{/* --- Recently finished. ---------------------------------------- */}
			{settled.length > 0 && (
				<Card>
					<CardHeader className="flex flex-wrap items-center justify-between gap-2">
						<CardTitle className="text-base">Recently completed</CardTitle>
						<Link
							href="/portal/orders"
							className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
						>
							Order history
							<ArrowRightIcon className="size-4" aria-hidden />
						</Link>
					</CardHeader>
					<CardContent>
						<ul className="grid gap-2">
							{settled.map((order) => (
								<li key={order.id}>
									<Link
										href={`/portal/orders/${order.id}`}
										className="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 transition-colors"
									>
										<div className="min-w-0">
											<p className="truncate font-medium">
												Order #{order.orderNumber}
											</p>
											<p className="text-muted-foreground text-xs">
												{(
													order.submittedAt ?? order.createdAt
												).toLocaleDateString("en-US")}
											</p>
										</div>
										<div className="flex items-center gap-3">
											<span className="font-medium">
												{formatMoney(order.total.toString())}
											</span>
											<OrderStatusBadge status={order.status} />
										</div>
									</Link>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			)}

			{inFlight.length === 0 && settled.length === 0 && draftLines === 0 && (
				<p className="text-muted-foreground text-sm">
					Nothing here yet. Once you send an order it stays on this screen until it is
					delivered.
				</p>
			)}
		</div>
	)
}
