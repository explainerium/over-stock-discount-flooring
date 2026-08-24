import { formatCoverage } from "@/lib/format/coverage"
import { formatMoney, formatUnitPrice } from "@/lib/format/money"

export interface OrderLineView {
	id: string
	name: string
	sku: string
	seriesName: string
	unitSelected: string
	qtyEntered: string
	boxes: number | null
	sqFt: string | null
	unitPrice: string
	unitPriceAtSubmit?: string | null
	pricingUom: string
	lineTotal: string
}

const UNIT_LABEL: Record<string, string> = {
	SQFT: "sq ft",
	BOX: "boxes",
	PALLET: "pallets",
	LF: "linear ft",
	STICK: "sticks",
	BUNDLE: "bundles",
	EACH: "each",
	ROLL: "rolls",
}

/**
 * The lines, read-only.
 *
 * Where the owner has changed a price since the order was submitted, both
 * figures are shown. The dealer agreed to one number and is being invoiced for
 * another, and the difference should be visible rather than something they have
 * to notice on the invoice.
 */
export function OrderLines({ lines }: { lines: OrderLineView[] }) {
	return (
		<ul className="grid">
			{lines.map((line) => {
				const changed =
					line.unitPriceAtSubmit && line.unitPriceAtSubmit !== line.unitPrice

				return (
					<li key={line.id} className="flex flex-wrap justify-between gap-4 border-b py-4">
						<div className="min-w-0">
							<p className="font-medium">{line.name}</p>
							<p className="text-muted-foreground font-mono text-xs">
								{line.sku} · {line.seriesName}
							</p>
							<p className="text-muted-foreground mt-2 text-sm">
								{line.qtyEntered} {UNIT_LABEL[line.unitSelected] ?? line.unitSelected}
								{line.boxes !== null && (
									<>
										{" → "}
										<span className="text-foreground">
											{line.boxes} {line.boxes === 1 ? "box" : "boxes"}
										</span>
									</>
								)}
								{line.sqFt && <> · {formatCoverage(line.sqFt)} sq ft</>}
							</p>
						</div>

						<div className="text-right">
							<p className="font-medium">{formatMoney(line.lineTotal)}</p>
							<p className="text-muted-foreground text-xs">
								{formatUnitPrice(line.unitPrice, line.pricingUom)}
							</p>
							{changed && (
								<p className="text-muted-foreground mt-1 text-xs">
									was {formatUnitPrice(line.unitPriceAtSubmit!, line.pricingUom)} at
									submission
								</p>
							)}
						</div>
					</li>
				)
			})}
		</ul>
	)
}
