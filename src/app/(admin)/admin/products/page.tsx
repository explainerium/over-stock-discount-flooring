import { PlusIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { requireStaff } from "@/server/auth/guards"
import { listAllProducts } from "@/server/repositories/catalog"
import { StockBadge } from "./_components/StockBadge"

export const metadata = { title: "Products" }

export default async function ProductsPage({
	searchParams,
}: {
	searchParams: Promise<{ q?: string }>
}) {
	await requireStaff()
	const { q } = await searchParams
	const products = await listAllProducts({ search: q })

	const published = products.filter((p) => p.isPublic).length

	return (
		<div className="grid gap-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-xl font-semibold tracking-wide uppercase">Products</h1>
					<p className="text-muted-foreground text-sm">
						{products.length} in the catalogue · {published} published
					</p>
				</div>
				<Button asChild>
					<Link href="/admin/products/new">
						<PlusIcon aria-hidden />
						Add product
					</Link>
				</Button>
			</div>

			{products.length === 0 ? (
				<Card>
					<CardContent className="text-muted-foreground py-10 text-center text-sm">
						Nothing in the catalogue yet.
					</CardContent>
				</Card>
			) : (
				<ul className="grid gap-2">
					{products.map((product) => (
						<li key={product.id}>
							<Link
								href={`/admin/products/${product.id}`}
								className="hover:bg-muted/50 flex flex-wrap items-center gap-4 rounded-lg border p-3 transition-colors"
							>
								<div className="bg-muted relative size-12 shrink-0 overflow-hidden rounded">
									{product.images[0] && (
										<Image
											src={product.images[0]}
											alt=""
											fill
											sizes="48px"
											className="object-cover"
										/>
									)}
								</div>

								<div className="min-w-0 flex-1">
									<p className="truncate font-medium">{product.name}</p>
									<p className="text-muted-foreground truncate font-mono text-xs">
										{product.sku} · {product.series.name}
									</p>
								</div>

								<div className="flex items-center gap-2">
									<StockBadge status={product.stockStatus} />
									{product.isPublic ? (
										<Badge>Public</Badge>
									) : (
										<Badge variant="outline">Hidden</Badge>
									)}
								</div>
							</Link>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}
