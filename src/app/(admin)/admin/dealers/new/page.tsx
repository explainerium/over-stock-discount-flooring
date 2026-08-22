import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireStaff } from "@/server/auth/guards"
import { NewDealerForm } from "./_components/NewDealerForm"

export const metadata = { title: "Add Dealer" }

export default async function NewDealerPage() {
	await requireStaff()

	return (
		<div className="grid max-w-2xl gap-4">
			<Link
				href="/admin/dealers"
				className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
			>
				<ArrowLeftIcon className="size-4" aria-hidden />
				Dealers
			</Link>

			<Card>
				<CardHeader>
					<CardTitle className="tracking-wide uppercase">Add Dealer</CardTitle>
					<CardDescription>
						Only the company name is required. Everything else can be filled in later.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<NewDealerForm />
				</CardContent>
			</Card>
		</div>
	)
}
