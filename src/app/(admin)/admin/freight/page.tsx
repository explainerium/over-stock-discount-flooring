import { AlertTriangleIcon, PlusIcon } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney } from "@/lib/format/money"
import { requireStaff } from "@/server/auth/guards"
import { listAccessorialRates, listZones } from "@/server/repositories/freight"
import { AccessorialRates } from "./_components/AccessorialRates"
import { ZoneStatusButton } from "./_components/ZoneStatusButton"

export const metadata = { title: "Freight" }

/** What each charge is actually for, in the owner's terms rather than the carrier's. */
const HINTS: Record<string, string> = {
	RESIDENTIAL: "A house rather than a dock. The carrier bills for the smaller truck.",
	LIFTGATE: "Nothing on site to get a pallet off the back of the trailer.",
	LIMITED_ACCESS: "Schools, sites, anywhere the driver has to be let in.",
}

/** "125 a pallet · 9.50 a box · min 250" — the row at a glance. */
function rateSummary(zone: {
	perPalletRate: { toString(): string } | null
	perBoxRate: { toString(): string } | null
	minCharge: { toString(): string } | null
}): string[] {
	const parts: string[] = []
	if (zone.perPalletRate) parts.push(`${formatMoney(zone.perPalletRate.toString())} a pallet`)
	if (zone.perBoxRate) parts.push(`${formatMoney(zone.perBoxRate.toString())} a box`)
	if (zone.minCharge) parts.push(`min ${formatMoney(zone.minCharge.toString())}`)
	return parts
}

/**
 * The freight rate table.
 *
 * Phase 1 quotes from this and nothing else — the plan's position, taken
 * because TQL have not granted API access and the build cannot wait on a third
 * party's decision. What it buys is that a dealer sees a delivery figure while
 * they are still building the order instead of after the owner has approved it.
 *
 * Every number here is one the owner has to get from a carrier, so the screen
 * is built to be filled in over weeks rather than in one sitting: a zone can be
 * saved half-known, and anything not yet rated is called out rather than
 * quietly rating at zero.
 */
export default async function FreightPage() {
	await requireStaff()
	const [zones, accessorials] = await Promise.all([listZones(), listAccessorialRates()])

	const active = zones.filter((zone) => zone.isActive)
	const unrated = active.filter((zone) => !zone.perPalletRate && !zone.perBoxRate)

	return (
		<div className="grid gap-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-xl font-semibold tracking-wide uppercase">Freight</h1>
					<p className="text-muted-foreground text-sm">
						What it costs to deliver, by where it is going. Orders you cannot rate here
						still reach you — you price those at approval, as now.
					</p>
				</div>
				<Button asChild>
					<Link href="/admin/freight/new">
						<PlusIcon aria-hidden />
						Add zone
					</Link>
				</Button>
			</div>

			{active.length === 0 && (
				<Alert>
					<AlertTriangleIcon />
					<AlertDescription>
						No zones are rating orders, so every dealer sees &ldquo;quoted when we
						approve&rdquo; and every order arrives for you to price by hand. One zone
						with a per-pallet rate is enough to change that.
					</AlertDescription>
				</Alert>
			)}

			{unrated.length > 0 && (
				<Alert>
					<AlertTriangleIcon />
					<AlertDescription>
						{unrated.length === 1
							? `${unrated[0].name} covers an area but has no rate on it, so orders going there still come to you unpriced.`
							: `${unrated.length} zones cover an area but have no rate on them, so orders going there still come to you unpriced.`}
					</AlertDescription>
				</Alert>
			)}

			<ul className="grid gap-2">
				{zones.map((zone) => {
					const summary = rateSummary(zone)
					const covers = [...zone.states, ...zone.zips]

					return (
						<li
							key={zone.id}
							className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
						>
							<Link href={`/admin/freight/${zone.id}`} className="min-w-0 flex-1">
								<p className="font-medium">{zone.name}</p>
								<p className="text-muted-foreground font-mono text-xs">
									{covers.length > 0 ? covers.join(" · ") : "covers nowhere"}
								</p>
								{summary.length > 0 && (
									<p className="text-muted-foreground mt-1 text-xs">
										{summary.join(" · ")}
										{zone.ftlThresholdPallets
											? ` · truckload from ${zone.ftlThresholdPallets} pallets`
											: ""}
									</p>
								)}
							</Link>

							<div className="flex items-center gap-2">
								{zone.isActive && summary.length === 0 && (
									<Badge variant="outline">No rate</Badge>
								)}
								{zone.isActive ? (
									<Badge>Rating</Badge>
								) : (
									<Badge variant="secondary">Retired</Badge>
								)}
								<ZoneStatusButton id={zone.id} isActive={zone.isActive} />
							</div>
						</li>
					)
				})}
			</ul>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Accessorials</CardTitle>
					<CardDescription>
						Charged on top of the freight, and only where the ship-to address is marked
						for them. These are the extras that surprise people on a freight bill, so
						they are quoted up front rather than added later.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<AccessorialRates
						charges={accessorials.map((charge) => ({
							...charge,
							hint: HINTS[charge.code] ?? "",
						}))}
					/>
				</CardContent>
			</Card>
		</div>
	)
}
