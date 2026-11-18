import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireStaff } from "@/server/auth/guards"
import { listDealerPricing } from "@/server/repositories/pricing"
import { FlatDiscountForm } from "./_components/FlatDiscountForm"
import { PricingTable } from "./_components/PricingTable"

/**
 * One dealer's prices.
 *
 * Three ways to arrive at a number, shown in the order they take effect: the
 * tier they sit in, the flat rate agreed with them, and any per-product
 * exceptions. The client has not told us which of the three he actually uses,
 * so all three are here and the ones he ignores stay empty.
 */
export default async function DealerPricingPage({ params }: { params: Promise<{ id: string }> }) {
	await requireStaff()
	const { id } = await params

	const { dealer, products, overrides } = await listDealerPricing(id)
	if (!dealer) notFound()

	const byProduct = new Map(overrides.map((row) => [row.productId, row]))

	const rows = products.map((product) => {
		const override = byProduct.get(product.id)
		return {
			productId: product.id,
			name: product.name,
			sku: product.sku,
			seriesName: product.series?.name ?? product.category.name,
			pricingUom: product.pricingUom,
			listPrice: product.listPrice?.toString() ?? null,
			price: override?.price?.toString() ?? "",
			discountPct: override?.discountPct?.toString() ?? "",
		}
	})

	const withoutListPrice = rows.filter((row) => !row.listPrice).length

	return (
		<div className="grid max-w-5xl gap-6">
			<Link
				href={`/admin/dealers/${dealer.id}`}
				className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
			>
				<ArrowLeftIcon className="size-4" aria-hidden />
				{dealer.companyName}
			</Link>

			<div>
				<h1 className="text-xl font-semibold tracking-wide uppercase">Pricing</h1>
				<p className="text-muted-foreground text-sm">
					{dealer.companyName} · {overrides.length} product{" "}
					{overrides.length === 1 ? "exception" : "exceptions"}
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">How this dealer is priced</CardTitle>
					<CardDescription>
						Most specific wins. A price on a product beats a discount on that product,
						which beats their flat rate, which beats their tier.
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-6">
					<div className="flex flex-wrap items-center gap-3 text-sm">
						<span className="text-muted-foreground">Tier</span>
						{dealer.priceTier ? (
							<Badge variant="secondary">
								{dealer.priceTier.name} · {dealer.priceTier.discountPct.toString()}%
								off
							</Badge>
						) : (
							<span className="text-muted-foreground text-xs">None set</span>
						)}
					</div>

					<div className="border-t pt-5">
						<FlatDiscountForm
							dealerId={dealer.id}
							discountPct={dealer.discountPct?.toString() ?? ""}
						/>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Per-product exceptions</CardTitle>
					<CardDescription>
						Set a price or a percentage on any product. Leave both empty and the dealer
						falls back to their flat rate.
						{withoutListPrice > 0 && (
							<>
								{" "}
								{withoutListPrice} product
								{withoutListPrice === 1 ? " has" : "s have"} no list price, so the
								flat rate and tier do not reach{" "}
								{withoutListPrice === 1 ? "it" : "them"}: type a price on each one
								this dealer should be able to order.
							</>
						)}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<PricingTable
						dealerId={dealer.id}
						rows={rows}
						fallback={
							dealer.discountPct
								? { pct: dealer.discountPct.toString(), label: "flat rate" }
								: dealer.priceTier
									? {
											pct: dealer.priceTier.discountPct.toString(),
											label: "tier",
										}
									: { pct: null, label: "flat rate" }
						}
					/>
				</CardContent>
			</Card>
		</div>
	)
}
