import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireStaff } from "@/server/auth/guards"
import { getZone } from "@/server/repositories/freight"
import { ZoneForm } from "../_components/ZoneForm"

export default async function EditZonePage({ params }: { params: Promise<{ id: string }> }) {
	await requireStaff()
	const { id } = await params

	const zone = await getZone(id)
	if (!zone) notFound()

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
					<CardTitle className="flex flex-wrap items-center gap-3">
						{zone.name}
						{!zone.isActive && <Badge variant="secondary">Retired</Badge>}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<ZoneForm
						zone={{
							id: zone.id,
							name: zone.name,
							// Back to the comma-separated line the owner typed. The
							// database holds arrays because that is what the engine
							// matches against; this is the form's shape, not the
							// storage one.
							states: zone.states.join(", "),
							zips: zone.zips.join(", "),
							perPalletRate: zone.perPalletRate?.toString() ?? "",
							perBoxRate: zone.perBoxRate?.toString() ?? "",
							minCharge: zone.minCharge?.toString() ?? "",
							ftlThresholdPallets: zone.ftlThresholdPallets?.toString() ?? "",
							ftlRate: zone.ftlRate?.toString() ?? "",
						}}
					/>
				</CardContent>
			</Card>
		</div>
	)
}
