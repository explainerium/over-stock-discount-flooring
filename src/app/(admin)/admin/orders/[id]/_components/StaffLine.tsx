"use client"

import { Trash2Icon } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatCoverage } from "@/lib/format/coverage"
import { differs } from "@/lib/format/dirty"
import { formatMoney, formatUnitPrice, uomLabel } from "@/lib/format/money"
import { removeOrderLineAction, updateOrderLineAction } from "../../_actions"

export interface StaffLineData {
	id: string
	name: string
	sku: string
	seriesName: string
	unitSelected: string
	qtyEntered: string
	wasteFactorPct: number
	boxes: number | null
	sqFt: string | null
	unitPrice: string
	unitPriceAtSubmit: string | null
	pricingUom: string
	lineTotal: string
}

/**
 * One line, as the owner sees it before approving.
 *
 * He can change two things: how much, and what it costs. The unit stays as the
 * dealer chose it — someone who ordered in square feet gets an order back in
 * square feet, and re-basing their own order under them is disorienting for no
 * gain.
 *
 * The submitted price is shown underneath whenever it differs from the current
 * one, so the size of his own edit is on screen while he makes it rather than
 * only afterwards.
 */
export function StaffLine({ orderId, line }: { orderId: string; line: StaffLineData }) {
	const [quantity, setQuantity] = useState(line.qtyEntered)
	const [unitPrice, setUnitPrice] = useState(line.unitPrice)
	const [pending, startTransition] = useTransition()

	const dirty = differs(quantity, line.qtyEntered) || differs(unitPrice, line.unitPrice)
	const changed = line.unitPriceAtSubmit && line.unitPriceAtSubmit !== line.unitPrice

	function save() {
		startTransition(async () => {
			const result = await updateOrderLineAction({
				orderId,
				itemId: line.id,
				quantity,
				unitPrice,
			})
			if (result.ok) toast.success(result.message)
			else toast.error(result.message)
		})
	}

	function remove() {
		startTransition(async () => {
			const result = await removeOrderLineAction({ orderId, itemId: line.id })
			if (result.ok) toast.success(result.message)
			else toast.error(result.message)
		})
	}

	return (
		<li className="grid gap-3 border-b py-4">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<div className="min-w-0">
					<p className="font-medium">{line.name}</p>
					<p className="text-muted-foreground font-mono text-xs">
						{line.sku} · {line.seriesName}
					</p>
				</div>
				<p className="font-medium">{formatMoney(line.lineTotal)}</p>
			</div>

			<div className="flex flex-wrap items-end gap-3">
				<label className="grid gap-1">
					<span className="text-muted-foreground text-xs">
						{uomLabel(line.unitSelected)}
						{line.wasteFactorPct > 0 && ` + ${line.wasteFactorPct}% waste`}
					</span>
					<Input
						value={quantity}
						onChange={(event) => setQuantity(event.target.value)}
						inputMode="decimal"
						aria-label={`Quantity of ${line.name}`}
						className="w-28"
						disabled={pending}
					/>
				</label>

				<label className="grid gap-1">
					<span className="text-muted-foreground text-xs">
						$ / {uomLabel(line.pricingUom)}
					</span>
					<Input
						value={unitPrice}
						onChange={(event) => setUnitPrice(event.target.value)}
						inputMode="decimal"
						aria-label={`Unit price for ${line.name}`}
						className="w-28"
						disabled={pending}
					/>
				</label>

				{dirty && (
					<Button type="button" size="sm" onClick={save} disabled={pending}>
						Update
					</Button>
				)}

				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={remove}
					disabled={pending}
					aria-label={`Remove ${line.name}`}
					className="ml-auto"
				>
					<Trash2Icon aria-hidden />
					Remove
				</Button>
			</div>

			<p className="text-muted-foreground text-xs">
				Ships as{" "}
				<span className="text-foreground">
					{line.boxes !== null
						? `${line.boxes} ${line.boxes === 1 ? "box" : "boxes"}`
						: `${line.qtyEntered} ${uomLabel(line.unitSelected)}`}
				</span>
				{line.sqFt && <> · {formatCoverage(line.sqFt)} sq ft covered</>}
				{changed && (
					<> · submitted at {formatUnitPrice(line.unitPriceAtSubmit!, line.pricingUom)}</>
				)}
			</p>
		</li>
	)
}
