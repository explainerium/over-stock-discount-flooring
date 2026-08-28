import { AlertTriangleIcon, ArrowLeftIcon } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { OrderLines } from "@/components/shared/OrderLines"
import { OrderStatusBadge } from "@/components/shared/OrderStatusBadge"
import { OrderTimeline } from "@/components/shared/OrderTimeline"
import { ShipmentSummary } from "@/components/shared/ShipmentSummary"
import { ShipToSummary } from "@/components/shared/ShipToSummary"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney } from "@/lib/format/money"
import { formatTerms } from "@/lib/format/terms"
import { requireStaff } from "@/server/auth/guards"
import type { AddressParts } from "@/server/domain/addresses"
import { TERMINAL, isEditable, label, transitionsFor } from "@/server/domain/orders"
import { getOrderForStaff } from "@/server/repositories/orders"
import { ChargesForm } from "./_components/ChargesForm"
import { OrderDecision, type DecisionOption } from "./_components/OrderDecision"
import { StaffLine } from "./_components/StaffLine"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const order = await getOrderForStaff(id)
	return { title: order ? `Order #${order.orderNumber}` : "Order" }
}

/** What to ask for when a move needs a reason. */
const PROMPTS: Record<string, string> = {
	CHANGES_REQUESTED: "What does the dealer need to change?",
	REJECTED: "Why can't we take this order?",
	CANCELLED: "Why is this being cancelled?",
	APPROVED: "Anything to tell the dealer?",
	SHIPPED: "Who is bringing it, and what should the dealer quote?",
}

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
	await requireStaff()
	const { id } = await params

	const order = await getOrderForStaff(id)
	if (!order) notFound()

	const editable = isEditable(order.status, "STAFF")

	/**
	 * The buttons come from the lifecycle table rather than from this page, so a
	 * move added there appears here without anybody remembering to add it.
	 */
	const options: DecisionOption[] = transitionsFor(order.status, "STAFF").map((move) => ({
		to: move.to,
		label: move.staffLabel ?? move.label,
		// Anything that ends an order asks for confirmation, whether or not the
		// table compels a reason. A tap that cannot be undone should cost two.
		confirms: move.note === "required" || TERMINAL.includes(move.to) || move.to === "SHIPPED",
		noteRequired: move.note === "required",
		ends: TERMINAL.includes(move.to),
		// Shipping asks for the shipment rather than for a note. Without it the
		// dealer gets "your order shipped" and nothing they can act on.
		collects: move.to === "SHIPPED" ? ("shipping" as const) : ("note" as const),
		prompt: PROMPTS[move.to] ?? "Add a note",
	}))

	const noFreight = Number(order.freight) === 0
	const lineCount = order.items.length
	const emptied = lineCount === 0

	return (
		<div className="grid max-w-4xl gap-6">
			<Link
				href="/admin/orders"
				className="text-muted-foreground hover:text-foreground -my-1 flex w-fit items-center gap-1 py-1 text-sm"
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
						<Link
							href={`/admin/dealers/${order.dealer.id}`}
							className="hover:underline"
						>
							{order.dealer.companyName}
						</Link>
						{order.dealer.paymentTerms && (
							<> · {formatTerms(order.dealer.paymentTerms)}</>
						)}
						{order.submittedAt && (
							<> · submitted {order.submittedAt.toLocaleDateString("en-US")}</>
						)}
					</p>
				</div>
				<OrderStatusBadge status={order.status} />
			</div>

			{/*
			 * The decision sits above the lines, with the figure it commits to
			 * printed on the same card. He can reach the buttons without scrolling,
			 * and he cannot reach them without the total being in front of him.
			 */}
			{options.length > 0 && (
				<Card>
					<CardContent className="grid gap-4 py-6">
						<div className="flex flex-wrap items-baseline justify-between gap-2">
							<p className="text-sm">
								{lineCount} {lineCount === 1 ? "line" : "lines"} ·{" "}
								<span className="text-muted-foreground">
									{formatMoney(order.subtotal.toString())} goods
								</span>
							</p>
							<p className="text-2xl font-medium">
								{formatMoney(order.total.toString())}
							</p>
						</div>

						{emptied && (
							<p className="flex items-start gap-2 text-sm">
								<AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
								<span>
									Nothing is left on this order. Reject or cancel it — it cannot
									go through empty.
								</span>
							</p>
						)}

						{noFreight && editable && !emptied && (
							<p className="flex items-start gap-2 text-sm">
								<AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
								<span>
									No freight on this order yet. Approving now sends it through at
									goods only.
								</span>
							</p>
						)}

						<OrderDecision orderId={order.id} options={options} />
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle className="text-base">
						{editable ? "Lines — editable until you approve" : "Lines"}
					</CardTitle>
				</CardHeader>
				<CardContent>
					{editable ? (
						<ul className="grid">
							{order.items.map((item) => (
								<StaffLine
									key={item.id}
									orderId={order.id}
									line={{
										id: item.id,
										name: item.productNameSnapshot,
										sku: item.productSkuSnapshot,
										seriesName: item.product.series.name,
										unitSelected: item.unitSelected,
										qtyEntered: item.qtyEntered.toString(),
										wasteFactorPct: item.wasteFactorPct,
										boxes: item.boxes,
										sqFt: item.sqFt?.toString() ?? null,
										unitPrice: item.unitPrice.toString(),
										unitPriceAtSubmit:
											item.unitPriceAtSubmit?.toString() ?? null,
										pricingUom: item.product.pricingUom,
										lineTotal: item.lineTotal.toString(),
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
							<dd>{formatMoney(order.freight.toString())}</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-muted-foreground">Tax</dt>
							<dd>{formatMoney(order.tax.toString())}</dd>
						</div>
						<div className="mt-2 flex justify-between border-t pt-3 font-medium">
							<dt>Total</dt>
							<dd className="text-lg">{formatMoney(order.total.toString())}</dd>
						</div>
					</dl>
				</CardContent>
			</Card>

			{order.carrier && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Shipment</CardTitle>
					</CardHeader>
					<CardContent>
						<ShipmentSummary
							carrier={order.carrier}
							proNumber={order.proNumber}
							bolNumber={order.bolNumber}
							trackingUrl={order.trackingUrl}
							shippedAt={order.shippedAt}
						/>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Ship to</CardTitle>
				</CardHeader>
				<CardContent>
					<ShipToSummary
						snapshot={order.shipToSnapshot as AddressParts | null}
						current={order.shipToAddress}
					/>
				</CardContent>
			</Card>

			{editable && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Freight &amp; tax</CardTitle>
					</CardHeader>
					<CardContent>
						<ChargesForm
							orderId={order.id}
							freight={order.freight.toString()}
							tax={order.tax.toString()}
							internalNotes={order.internalNotes ?? ""}
							weightLb={order.totalWeightLb?.toString() ?? null}
							palletCount={order.palletCount}
						/>
					</CardContent>
				</Card>
			)}

			{order.dealerNotes && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							Note from {order.dealer.companyName}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm whitespace-pre-wrap">{order.dealerNotes}</p>
					</CardContent>
				</Card>
			)}

			{!editable && order.internalNotes && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Internal note</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm whitespace-pre-wrap">{order.internalNotes}</p>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle className="text-base">History</CardTitle>
				</CardHeader>
				<CardContent>
					{order.history.length > 0 ? (
						<OrderTimeline entries={order.history} />
					) : (
						<p className="text-muted-foreground text-sm">
							Nothing yet — this order is still {label(order.status).toLowerCase()}.
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
