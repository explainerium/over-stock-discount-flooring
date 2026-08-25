import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireStaff } from "@/server/auth/guards"
import { listSeriesOptions } from "@/server/repositories/catalog"
import { NewProductForm } from "./_components/NewProductForm"

export const metadata = { title: "Add Product" }

export default async function NewProductPage() {
	await requireStaff()
	const series = await listSeriesOptions()

	return (
		<div className="grid max-w-xl gap-4">
			<Link
				href="/admin/products"
				className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
			>
				<ArrowLeftIcon className="size-4" aria-hidden />
				Products
			</Link>

			<Card>
				<CardHeader>
					<CardTitle className="tracking-wide uppercase">Add Product</CardTitle>
					<CardDescription>
						Name, SKU, series and an image. Everything else — thickness, wear layer, sq
						ft a box, pallet weight — is inherited from the series.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<NewProductForm
						seriesOptions={series.map((s) => ({
							value: s.id,
							label: s.name,
							hint: s.sqFtPerBox ? `${s.sqFtPerBox} sq ft/box` : undefined,
						}))}
					/>
				</CardContent>
			</Card>
		</div>
	)
}
