import { ExternalLinkIcon } from "lucide-react"

export interface ShipmentSummaryProps {
	carrier: string | null
	proNumber: string | null
	bolNumber: string | null
	trackingUrl: string | null
	shippedAt: Date | null
}

/**
 * Who is bringing it, and what to quote at them.
 *
 * The same details that go out in the shipping email, kept on the order too.
 * The email answers the question on the day; this answers it the following
 * week, when the dealer has lost the email and is about to ring up instead —
 * which is the call the notification was meant to remove in the first place.
 */
export function ShipmentSummary({
	carrier,
	proNumber,
	bolNumber,
	trackingUrl,
	shippedAt,
}: ShipmentSummaryProps) {
	if (!carrier && !proNumber && !bolNumber && !trackingUrl) return null

	const rows: [string, string][] = [
		...((carrier ? [["Carrier", carrier]] : []) as [string, string][]),
		...((proNumber ? [["PRO", proNumber]] : []) as [string, string][]),
		...((bolNumber ? [["BOL", bolNumber]] : []) as [string, string][]),
		...((shippedAt ? [["Shipped", shippedAt.toLocaleDateString("en-US")]] : []) as [
			string,
			string,
		][]),
	]

	return (
		<div className="grid gap-3">
			<dl className="grid gap-2 text-sm">
				{rows.map(([label, value]) => (
					<div key={label} className="flex justify-between gap-4">
						<dt className="text-muted-foreground">{label}</dt>
						<dd className="text-right font-mono text-xs">{value}</dd>
					</div>
				))}
			</dl>

			{trackingUrl && (
				<a
					href={trackingUrl}
					target="_blank"
					rel="noreferrer noopener"
					className="flex w-fit items-center gap-1.5 text-sm underline underline-offset-4"
				>
					Track this shipment
					<ExternalLinkIcon className="size-3.5" aria-hidden />
				</a>
			)}
		</div>
	)
}
