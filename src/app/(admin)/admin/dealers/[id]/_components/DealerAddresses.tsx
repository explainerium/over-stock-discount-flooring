import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { accessorialsOf, addressLines, addressName } from "@/server/domain/addresses"

export interface DealerAddressRow {
	id: string
	label: string | null
	line1: string
	line2: string | null
	city: string
	state: string
	zip: string
	isResidential: boolean
	needsLiftgate: boolean
	limitedAccess: boolean
	isDefault: boolean
	isActive: boolean
}

/**
 * A dealer's delivery addresses, as the owner sees them.
 *
 * Read-only here on purpose. Dealers keep their own book — a counter person
 * adding tomorrow's jobsite should not have to ring the office — and the owner
 * needs this screen to answer "where do they usually take delivery" and to see
 * the accessorials before quoting anything.
 *
 * Archived ones are kept in the list because a past order may still point at
 * one, and an address that has vanished from every screen is harder to explain
 * than one marked removed.
 */
export function DealerAddresses({ addresses }: { addresses: DealerAddressRow[] }) {
	const active = addresses.filter((address) => address.isActive)

	return (
		<Card>
			<CardHeader>
				<CardTitle>Delivery addresses</CardTitle>
				<CardDescription>
					{active.length === 0
						? "None on file. Orders cannot be submitted until this dealer adds one."
						: "Kept by the dealer. Freight is quoted on whichever they pick."}
				</CardDescription>
			</CardHeader>
			<CardContent>
				{addresses.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Nothing yet. They will be prompted for one the first time they build an
						order.
					</p>
				) : (
					<ul className="grid gap-4">
						{addresses.map((address) => {
							const extras = accessorialsOf(address)

							return (
								<li
									key={address.id}
									className="border-b pb-4 last:border-b-0 last:pb-0"
								>
									<p className="text-sm font-medium">
										{addressName(address)}
										{address.isDefault && address.isActive && (
											<span className="text-muted-foreground ml-2 text-xs tracking-widest uppercase">
												Default
											</span>
										)}
										{!address.isActive && (
											<span className="text-muted-foreground ml-2 text-xs tracking-widest uppercase">
												Removed
											</span>
										)}
									</p>
									<address className="text-muted-foreground mt-1 text-sm not-italic">
										{addressLines(address).join(", ")}
									</address>
									{extras.length > 0 && (
										<p className="mt-1 text-xs">{extras.join(" · ")}</p>
									)}
								</li>
							)
						})}
					</ul>
				)}
			</CardContent>
		</Card>
	)
}
