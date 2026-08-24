import { ShoppingCartIcon } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatCoverage } from "@/lib/format/coverage"
import { formatMoney } from "@/lib/format/money"
import { requireDealerScope } from "@/server/auth/guards"
import { getDraft } from "@/server/repositories/orders"
import { CartLine } from "./_components/CartLine"
import { SubmitOrder } from "./_components/SubmitOrder"

export const metadata = { title: "Your Order" }

/**
 * The cart.
 *
 * Deliberately not called a cart anywhere the dealer can see. This is an order
 * being built and then submitted for approval — there is no checkout, nothing
 * is paid here, and calling it a cart sets an expectation the system does not
 * meet.
 */
export default async function CartPage() {
	const { dealerId, user } = await requireDealerScope()
	const draft = await getDraft(dealerId)

	const lines = draft?.items ?? []

	if (lines.length === 0) {
		return (
			<Card>
				<CardContent className="py-16 text-center">
					<ShoppingCartIcon
						className="text-muted-foreground mx-auto size-8"
						aria-hidden
					/>
					<p className="mt-5 font-medium">Nothing on this order yet</p>
					<p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm">
						Add colours from the catalogue. Type a square footage and we will round it
						to whole boxes for you.
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
				<h1 className="text-xl font-semibold tracking-wide uppercase">Your Order</h1>
				<p className="text-muted-foreground text-sm">
					{lines.length} {lines.length === 1 ? "line" : "lines"} · {user.dealerName}
				</p>
			</div>

			<ul className="grid">
				{lines.map((item) => (
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
							boxes: item.boxes,
							sqFt: item.sqFt?.toString() ?? null,
							unitPrice: item.unitPrice.toString(),
							pricingUom: item.product.pricingUom,
							lineTotal: item.lineTotal.toString(),
							orderUoms: item.product.orderUoms,
							wasteFactorPct: item.wasteFactorPct,
						}}
					/>
				))}
			</ul>

			<Card>
				<CardContent className="grid gap-3 py-6">
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Subtotal</span>
						<span className="font-medium">
							{formatMoney(draft!.subtotal.toString())}
						</span>
					</div>

					{/* Freight is quoted at approval in Phase 1, so the order says so
					    rather than showing a zero that looks like free delivery. */}
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Freight</span>
						<span className="text-muted-foreground">Quoted when we approve</span>
					</div>

					{draft!.totalWeightLb && (
						<div className="text-muted-foreground flex justify-between text-xs">
							<span>Shipment</span>
							<span>
								{formatCoverage(draft!.totalWeightLb.toString())} lb
								{draft!.palletCount
									? ` · ${draft!.palletCount} pallet${draft!.palletCount === 1 ? "" : "s"}`
									: ""}
							</span>
						</div>
					)}

					<div className="mt-2 flex justify-between border-t pt-3">
						<span className="font-medium">Total so far</span>
						<span className="text-lg font-semibold">
							{formatMoney(draft!.subtotal.toString())}
						</span>
					</div>
				</CardContent>
			</Card>

			<SubmitOrder />

			<div>
				<Button variant="outline" asChild>
					<Link href="/portal/catalog">Keep adding</Link>
				</Button>
			</div>
			<p className="text-muted-foreground text-xs">
				Nothing is charged here. We review the order, confirm freight, and invoice through
				QuickBooks once it is approved.
			</p>
		</div>
	)
}
