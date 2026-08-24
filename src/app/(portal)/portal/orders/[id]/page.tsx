import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CartLine } from "@/app/(portal)/portal/cart/_components/CartLine"
import { SubmitOrder } from "@/app/(portal)/portal/cart/_components/SubmitOrder"
import { OrderLines } from "@/components/shared/OrderLines"
import { OrderStatusBadge } from "@/components/shared/OrderStatusBadge"
import { OrderTimeline } from "@/components/shared/OrderTimeline"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCoverage } from "@/lib/format/coverage"
import { formatMoney } from "@/lib/format/money"
import { requireDealerScope } from "@/server/auth/guards"
import { dealerExplanation, isEditable } from "@/server/domain/orders"
import { getDealerOrder } from "@/server/repositories/orders"

export default async function DealerOrderPage({ params }: { params: Promise<{ id: string }> }) {
	const { dealerId } = await requireDealerScope()
	const { id } = await params

	const order = await getDealerOrder(dealerId, id)
	if (!order) notFound()

	const editable = isEditable(order.status, "DEALER")

	return (
		<div className="grid max-w-4xl gap-6">
			<Link
				href="/portal/orders"
				className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
			>
				<ArrowLeftIcon className="size-4" aria-hidden />
				Orders
			</Link>

			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-xl font-semibold tracking-wide uppercase">
						Order #{order.orderNumber}
					</h1>
					<p className="text-muted-foreground mt-1 text-sm">
						{dealerExplanation(order.status)}
					</p>
				</div>
				<OrderStatusBadge status={order.status} />
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">
						{editable ? "Lines — change what you need to" : "Lines"}
					</CardTitle>
				</CardHeader>
				<CardContent>
					{/*
					 * An order the owner has sent back is edited here rather than in
					 * the cart. The cart holds the next order a dealer is building;
					 * sending them there to fix this one would show them an empty
					 * screen and read as though the order had gone.
					 */}
					{editable ? (
						<ul className="grid">
							{order.items.map((item) => (
								<CartLine
									key={item.id}
									line={{
										id: item.id,
										name: item.productNameSnapshot,
										sku: item.productSkuSnapshot,
										seriesName: item.product.series.name,
										image: item.product.images[0] ?? null,
										unitSelected: item.unitSelected,
										qtyEntered: item.qtyEntered.toString(),
										wasteFactorPct: item.wasteFactorPct,
										boxes: item.boxes,
										sqFt: item.sqFt?.toString() ?? null,
										unitPrice: item.unitPrice.toString(),
										pricingUom: item.product.pricingUom,
										lineTotal: item.lineTotal.toString(),
										orderUoms: item.product.orderUoms,
									}}
								/>
							))}
						</ul>
					) : (
						<OrderLines
							lines={order.items.map((item) => ({
								id: item.id,
								name: item.productNameSnapshot,
								sku: item.productSkuSnapshot,
								seriesName: item.product.series.name,
								unitSelected: item.unitSelected,
								qtyEntered: item.qtyEntered.toString(),
								boxes: item.boxes,
								sqFt: item.sqFt?.toString() ?? null,
								unitPrice: item.unitPrice.toString(),
								unitPriceAtSubmit: item.unitPriceAtSubmit?.toString() ?? null,
								pricingUom: item.product.pricingUom,
								lineTotal: item.lineTotal.toString(),
							}))}
						/>
					)}

					<dl className="mt-6 grid gap-2 text-sm">
						<div className="flex justify-between">
							<dt className="text-muted-foreground">Subtotal</dt>
							<dd>{formatMoney(order.subtotal.toString())}</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-muted-foreground">Freight</dt>
							<dd>
								{Number(order.freight) > 0
									? formatMoney(order.freight.toString())
									: "Quoted at approval"}
							</dd>
						</div>
						{order.totalWeightLb && (
							<div className="text-muted-foreground flex justify-between text-xs">
								<dt>Shipment</dt>
								<dd>
									{formatCoverage(order.totalWeightLb.toString())} lb
									{order.palletCount
										? ` · ${order.palletCount} pallet${order.palletCount === 1 ? "" : "s"}`
										: ""}
								</dd>
							</div>
						)}
						<div className="mt-2 flex justify-between border-t pt-3 font-medium">
							<dt>Total</dt>
							<dd className="text-lg">{formatMoney(order.total.toString())}</dd>
						</div>
					</dl>
				</CardContent>
			</Card>

			{editable && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">When you are done</CardTitle>
					</CardHeader>
					<CardContent>
						<SubmitOrder orderId={order.id} disabled={order.items.length === 0} />
					</CardContent>
				</Card>
			)}

			{order.dealerNotes && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Your note</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm whitespace-pre-wrap">{order.dealerNotes}</p>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle className="text-base">History</CardTitle>
				</CardHeader>
				<CardContent>
					<OrderTimeline entries={order.history} />
				</CardContent>
			</Card>
		</div>
	)
}
