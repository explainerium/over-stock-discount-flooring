import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireStaff } from "@/server/auth/guards"
import { listAllCategories } from "@/server/repositories/catalog"
import { NewCategoryForm } from "./_components/NewCategoryForm"

export const metadata = { title: "Categories" }

/**
 * The shelves of the catalog.
 *
 * The client said the range will keep growing — trim, stair parts, butcher
 * block, carpet padding, and stocked carpet after that — so a new shelf is a
 * form here rather than a change to the code.
 */
export default async function CategoriesPage() {
	await requireStaff()
	const categories = await listAllCategories()

	return (
		<div className="grid gap-6">
			<div>
				<h1 className="text-xl font-semibold tracking-wide uppercase">Categories</h1>
				<p className="text-muted-foreground text-sm">
					How the public catalog is grouped. A category only shows on the site once it has
					a published product in it.
				</p>
			</div>

			<ul className="grid gap-2">
				{categories.map((category) => (
					<li key={category.id}>
						<Link
							href={`/admin/categories/${category.id}`}
							className="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 transition-colors"
						>
							<div className="min-w-0">
								<p className="font-medium">{category.name}</p>
								<p className="text-muted-foreground font-mono text-xs">
									/products?category={category.slug} · {category._count.products}{" "}
									{category._count.products === 1 ? "product" : "products"} ·
									position {category.sortOrder}
								</p>
							</div>
							{category.isActive ? (
								<Badge>Active</Badge>
							) : (
								<Badge variant="secondary">Hidden</Badge>
							)}
						</Link>
					</li>
				))}
			</ul>

			<Card className="max-w-xl">
				<CardHeader>
					<CardTitle className="tracking-wide uppercase">Add Category</CardTitle>
					<CardDescription>
						Lower positions come first in the catalog and the menu.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<NewCategoryForm />
				</CardContent>
			</Card>
		</div>
	)
}
