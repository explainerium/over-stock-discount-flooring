import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireStaff } from "@/server/auth/guards"
import { getCategory } from "@/server/repositories/catalog"
import { EditCategoryForm } from "../_components/EditCategoryForm"

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
	await requireStaff()
	const { id } = await params

	const category = await getCategory(id)
	if (!category) notFound()

	return (
		<div className="grid max-w-xl gap-4">
			<Link
				href="/admin/categories"
				className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
			>
				<ArrowLeftIcon className="size-4" aria-hidden />
				Categories
			</Link>

			<Card>
				<CardHeader>
					<CardTitle>{category.name}</CardTitle>
					<CardDescription>
						{category._count.products}{" "}
						{category._count.products === 1 ? "product" : "products"}. Its address stays{" "}
						<span className="font-mono">/products?category={category.slug}</span> even
						if you rename it, so old links keep working.{" "}
						<Link
							href={`/admin/products?category=${category.id}`}
							className="underline underline-offset-4"
						>
							See its products
						</Link>
					</CardDescription>
				</CardHeader>
				<CardContent>
					<EditCategoryForm
						defaults={{
							id: category.id,
							name: category.name,
							blurb: category.blurb ?? "",
							sortOrder: String(category.sortOrder),
							isActive: category.isActive,
						}}
					/>
				</CardContent>
			</Card>
		</div>
	)
}
