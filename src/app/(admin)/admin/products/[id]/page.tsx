import { ArrowLeftIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireStaff } from "@/server/auth/guards"
import { getProduct, listSeriesOptions } from "@/server/repositories/catalog"
import { EditProductForm } from "./_components/EditProductForm"

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
	await requireStaff()
	const { id } = await params

	const [product, series] = await Promise.all([getProduct(id), listSeriesOptions()])
	if (!product) notFound()

	return (
		<div className="grid max-w-3xl gap-4">
			<Link
				href="/admin/products"
				className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
			>
				<ArrowLeftIcon className="size-4" aria-hidden />
				Products
			</Link>

			<Card>
				<CardHeader className="flex flex-row items-center gap-4">
					<div className="bg-muted relative size-16 shrink-0 overflow-hidden rounded">
						{product.images[0] && (
							<Image
								src={product.images[0]}
								alt=""
								fill
								sizes="64px"
								className="object-cover"
							/>
						)}
					</div>
					<div>
						<CardTitle>{product.name}</CardTitle>
						<p className="text-muted-foreground font-mono text-xs">
							{product.sku} · {product.series.name}
							{product.series.sqFtPerBox &&
								` · ${product.series.sqFtPerBox} sq ft/box`}
						</p>
					</div>
				</CardHeader>
				<CardContent>
					<EditProductForm
						seriesOptions={series.map((s) => ({
							value: s.id,
							label: s.name,
							hint: s.sqFtPerBox ? `${s.sqFtPerBox} sq ft/box` : undefined,
						}))}
						defaults={{
							id: product.id,
							name: product.name,
							sku: product.sku,
							seriesId: product.seriesId,
							designName: product.designName ?? "",
							description: product.description ?? "",
							listPrice: product.listPrice?.toString() ?? "",
							pricingUom: product.pricingUom,
							orderUoms: product.orderUoms,
							stockStatus: product.stockStatus,
							isPublic: product.isPublic,
							isActive: product.isActive,
							images: product.images.join("\n"),
						}}
					/>
				</CardContent>
			</Card>
		</div>
	)
}
