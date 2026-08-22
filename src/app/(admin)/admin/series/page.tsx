import { AlertTriangleIcon } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { requireStaff } from "@/server/auth/guards"
import { listAllSeries } from "@/server/repositories/catalog"

export const metadata = { title: "Series" }

export default async function SeriesPage() {
	await requireStaff()
	const series = await listAllSeries()

	// Surfaced rather than left to be discovered in week eight: freight class and
	// NMFC code are not on the client's current site and have to come from the
	// manufacturer. Nothing can quote an LTL rate without them.
	const missingFreight = series.filter((s) => s.sqFtPerBox && !s.freightClass)

	return (
		<div className="grid gap-6">
			<div>
				<h1 className="text-xl font-semibold tracking-wide uppercase">Series</h1>
				<p className="text-muted-foreground text-sm">
					Specs live here. Change a figure once and every colour in the series follows.
				</p>
			</div>

			{missingFreight.length > 0 && (
				<Alert>
					<AlertTriangleIcon />
					<AlertDescription>
						{missingFreight.length} series have no freight class or NMFC code yet. No
						LTL rate can be quoted without them — they need to come from the
						manufacturer.
					</AlertDescription>
				</Alert>
			)}

			<ul className="grid gap-2">
				{series.map((s) => (
					<li key={s.id}>
						<Link
							href={`/admin/series/${s.id}`}
							className="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 transition-colors"
						>
							<div className="min-w-0">
								<p className="font-medium">{s.name}</p>
								<p className="text-muted-foreground font-mono text-xs">
									{s._count.products} products
									{s.sqFtPerBox && ` · ${s.sqFtPerBox} sq ft/box`}
									{s.boxesPerPallet && ` · ${s.boxesPerPallet} box/plt`}
									{s.wearLayerMil && ` · ${s.wearLayerMil} mil`}
								</p>
							</div>
							<div className="flex items-center gap-2">
								{!s.freightClass && s.sqFtPerBox && (
									<Badge variant="outline">No freight class</Badge>
								)}
								{s.isActive ? (
									<Badge>Active</Badge>
								) : (
									<Badge variant="secondary">Hidden</Badge>
								)}
							</div>
						</Link>
					</li>
				))}
			</ul>
		</div>
	)
}
