import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { OrderStatusBadge } from "@/components/shared/OrderStatusBadge"
import { formatMoney } from "@/lib/format/money"
import { requireDealerScope } from "@/server/auth/guards"
import { listDealerOrders } from "@/server/repositories/orders"

export const metadata = { title: "Order History" }

export default async function OrdersPage() {
	const { dealerId } = await requireDealerScope()
	const orders = await listDealerOrders(dealerId)

	if (orders.length === 0) {
		return (
			<Card>
				<CardContent className="py-16 text-center">
					<p className="font-medium">No orders yet</p>
					<p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm">
						Once you submit an order it appears here, and you can follow it through to
						delivery.
					</p>
					<Button asChild className="mt-8">
						<Link href="/portal/catalog">Browse the catalog</Link>
					</Button>
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="grid max-w-4xl gap-6">
			<div>
				<h1 className="text-xl font-semibold tracking-wide uppercase">Order History</h1>
				<p className="text-muted-foreground text-sm">
					{orders.length} {orders.length === 1 ? "order" : "orders"}
				</p>
			</div>

			<ul className="grid gap-2">
				{orders.map((order) => (
					<li key={order.id}>
						<Link
							href={`/portal/orders/${order.id}`}
							className="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 transition-colors"
						>
							<div>
								<p className="font-medium">Order #{order.orderNumber}</p>
								<p className="text-muted-foreground text-xs">
									{order._count.items} {order._count.items === 1 ? "line" : "lines"} ·{" "}
									{(order.submittedAt ?? order.createdAt).toLocaleDateString("en-US")}
								</p>
							</div>
							<div className="flex items-center gap-4">
								<span className="font-medium">{formatMoney(order.total.toString())}</span>
								<OrderStatusBadge status={order.status} />
							</div>
						</Link>
					</li>
				))}
			</ul>
		</div>
	)
}
