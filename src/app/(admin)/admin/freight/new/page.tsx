import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireStaff } from "@/server/auth/guards"
import { ZoneForm } from "../_components/ZoneForm"

export const metadata = { title: "Add Freight Zone" }

export default async function NewZonePage() {
	await requireStaff()

	return (
		<div className="grid max-w-2xl gap-4">
			<Link
				href="/admin/freight"
				className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
			>
				<ArrowLeftIcon className="size-4" aria-hidden />
				Freight
			</Link>

			<Card>
				<CardHeader>
					<CardTitle className="tracking-wide uppercase">Add Zone</CardTitle>
					<CardDescription>
						Only the name and the area it covers are required. Add the rates as the
						carrier gives them to you.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ZoneForm />
				</CardContent>
			</Card>
		</div>
	)
}
