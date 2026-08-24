import { AlertTriangleIcon } from "lucide-react"
import {
	accessorialsOf,
	addressLines,
	addressName,
	formatAddress,
	type AddressParts,
} from "@/server/domain/addresses"

export interface ShipToSummaryProps {
	/** The destination as it stood when the order was sent. */
	snapshot: AddressParts | null
	/** The address record it was taken from, if it still exists. */
	current: (AddressParts & { isActive: boolean }) | null
}

/**
 * Where an order is going.
 *
 * The frozen copy is what gets shown, because that is the place freight was
 * quoted against. Where the live address has since been edited, both are shown
 * and the difference is called out: someone correcting a street number after
 * submitting is exactly the case where quoting one address and delivering to
 * another goes unnoticed until the truck cannot find it.
 */
export function ShipToSummary({ snapshot, current }: ShipToSummaryProps) {
	const shown = snapshot ?? current

	if (!shown) {
		return (
			<p className="text-muted-foreground text-sm">
				No delivery address on this order. Freight cannot be quoted without one.
			</p>
		)
	}

	const extras = accessorialsOf(shown)
	const edited = snapshot && current ? formatAddress(snapshot) !== formatAddress(current) : false

	return (
		<div className="grid gap-2 text-sm">
			<div>
				<p className="font-medium">{addressName(shown)}</p>
				<address className="text-muted-foreground mt-1 not-italic">
					{addressLines(shown).map((line) => (
						<span key={line} className="block">
							{line}
						</span>
					))}
				</address>
			</div>

			{extras.length > 0 ? (
				<p className="text-xs">{extras.join(" · ")}</p>
			) : (
				<p className="text-muted-foreground text-xs">
					No liftgate, residential or limited-access charges.
				</p>
			)}

			{edited && current && (
				<p className="flex items-start gap-2 pt-1 text-xs">
					<AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
					<span>
						This address has been edited since the order was sent. It now reads{" "}
						<span className="text-foreground">{formatAddress(current)}</span> — check
						which one is right before freight is quoted.
					</span>
				</p>
			)}

			{current && !current.isActive && (
				<p className="text-muted-foreground text-xs">
					The dealer has since removed this address from their book.
				</p>
			)}
		</div>
	)
}
