import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { formatDiscount, formatUnitPrice } from "@/lib/format/money"
import { stockLabel } from "@/lib/format/stock"
import { requireDealerScope } from "@/server/auth/guards"
import { countOrderableProducts, listPricedProducts } from "@/server/repositories/pricing"
import { AddToOrder } from "./_components/AddToOrder"
import { CatalogSearch } from "./_components/CatalogSearch"

export const metadata = { title: "Catalog" }

/**
 * The dealer catalogue: everything, at their prices.
 *
 * This is the first screen in the build where the two engines meet a real
 * dealer — the price comes from the pricing engine at their rate, and the box
 * count comes from the UOM engine as they type.
 */
export default async function PortalCatalogPage({
	searchParams,
}: {
	searchParams: Promise<{ q?: string }>
}) {
	const { dealerId, user } = await requireDealerScope()
	const { q } = await searchParams

	const [products, total] = await Promise.all([
		listPricedProducts(dealerId, q),
		countOrderableProducts(dealerId),
	])

	const unpriced = products.filter((product) => !product.price).length

	return (
		<div className="grid gap-6">
			<div>
				<h1 className="text-xl font-semibold tracking-wide uppercase">Catalog</h1>
				<p className="text-muted-foreground text-sm">
					{/* The catalogue total, not the filtered one. What the search is
					    showing is said next to the search, where it belongs. */}
					{total} {total === 1 ? "product" : "products"} at {user.dealerName}&rsquo;s
					pricing.
					{unpriced > 0 && ` ${unpriced} not priced yet.`}
				</p>
			</div>

			<CatalogSearch resultCount={products.length} total={total} />

			{products.length === 0 && (
				<p className="text-muted-foreground py-12 text-center text-sm">
					Nothing matches &ldquo;{q}&rdquo;. Try part of a colour name, or a SKU.
				</p>
			)}

			<ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{products.map((product) => (
					<li key={product.id} className="flex gap-4 rounded-lg border p-4">
						<div className="bg-muted relative size-24 shrink-0 overflow-hidden rounded">
							{product.images[0] && (
								<Image
									src={product.images[0]}
									alt=""
									fill
									sizes="96px"
									className="object-cover"
								/>
							)}
						</div>

						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-start justify-between gap-2">
								<div className="min-w-0">
									<p className="truncate font-medium">{product.name}</p>
									<p className="text-muted-foreground truncate font-mono text-xs">
										{product.sku} · {product.seriesName}
									</p>
								</div>
								{product.stockStatus !== "IN_STOCK" && (
									<Badge
										variant={
											product.stockStatus === "OUT"
												? "destructive"
												: "outline"
										}
									>
										{stockLabel(product.stockStatus)}
									</Badge>
								)}
							</div>

							{product.price && (
								<p className="mt-2 text-sm">
									<span className="font-medium">
										{formatUnitPrice(
											product.price.unitPrice,
											product.pricingUom,
										)}
									</span>
									{formatDiscount(product.price.discountPct) && (
										<span className="text-muted-foreground ml-2 text-xs">
											{formatDiscount(product.price.discountPct)}
										</span>
									)}
								</p>
							)}

							<div className="mt-3">
								<AddToOrder
									product={{
										id: product.id,
										name: product.name,
										sku: product.sku,
										pricingUom: product.pricingUom,
										orderUoms: product.orderUoms,
										unitPrice: product.price?.unitPrice.toString() ?? null,
										sqFtPerBox: product.sqFtPerBox,
										boxesPerPallet: product.boxesPerPallet,
										lbPerBox: product.lbPerBox,
									}}
								/>
							</div>
						</div>
					</li>
				))}
			</ul>
		</div>
	)
}
