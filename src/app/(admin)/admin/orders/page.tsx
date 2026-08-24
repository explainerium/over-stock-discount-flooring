import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { OrderStatusBadge } from "@/components/shared/OrderStatusBadge"
import { formatMoney } from "@/lib/format/money"
import { requireStaff } from "@/server/auth/guards"
import { listOrdersForStaff } from "@/server/repositories/orders"

export const metadata = { title: "Orders" }

/**
 * The queue.
 *
 * Awaiting approval at the top, oldest first — the order that has been waiting
 * longest is the one somebody is most likely about to ring about. Everything
 * else follows underneath so the owner can find an order without filtering.
 */
export default async function OrdersPage() {
	await requireStaff()
	const orders = await listOrdersForStaff()

	const waiting = orders.filter((order) => order.status === "SUBMITTED")
	const rest = orders.filter((order) => order.status !== "SUBMITTED")

	return (
		<div className="grid gap-6">
			<div>
				<h1 className="text-xl font-semibold tracking-wide uppercase">Orders</h1>
				<p className="text-muted-foreground text-sm">
					{waiting.length} awaiting approval · {orders.length} in total
				</p>
			</div>

			{orders.length === 0 ? (
				<Card>
					<CardContent className="text-muted-foreground py-10 text-center text-sm">
						No orders yet. Submitted orders land here.
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-8">
					{[
						{ title: "Awaiting approval", list: waiting },
						// "Everything else" only reads as a heading when there is something
						// for it to be else of.
						{
							title: waiting.length > 0 ? "Everything else" : "All orders",
							list: rest,
						},
					]
						.filter((group) => group.list.length > 0)
						.map((group) => (
							<section key={group.title}>
								<h2 className="text-muted-foreground text-xs tracking-widest uppercase">
									{group.title}
								</h2>
								<ul className="mt-3 grid gap-2">
									{group.list.map((order) => (
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
														{order._count.items === 1
															? "line"
															: "lines"}{" "}
														·{" "}
														{(
															order.submittedAt ?? order.createdAt
														).toLocaleDateString("en-US")}
													</p>
												</div>
												<div className="flex items-center gap-4">
													<span className="font-medium">
														{formatMoney(order.total.toString())}
													</span>
													<OrderStatusBadge status={order.status} />
												</div>
											</Link>
										</li>
									))}
								</ul>
							</section>
						))}
				</div>
			)}
		</div>
	)
}
