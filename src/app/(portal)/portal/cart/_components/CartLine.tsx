"use client"

import { Trash2Icon } from "lucide-react"
import Image from "next/image"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatCoverage } from "@/lib/format/coverage"
import { formatMoney, formatUnitPrice } from "@/lib/format/money"
import { removeLineAction, updateLineAction } from "../../_actions"

export interface CartLineData {
	id: string
	name: string
	sku: string
	seriesName: string
	image: string | null
	unitSelected: string
	qtyEntered: string
	boxes: number | null
	sqFt: string | null
	unitPrice: string
	pricingUom: string
	lineTotal: string
	orderUoms: string[]
}

const UNIT_LABEL: Record<string, string> = {
	SQFT: "Sq ft",
	BOX: "Boxes",
	PALLET: "Pallets",
	LF: "Linear ft",
	STICK: "Sticks",
	BUNDLE: "Bundles",
	EACH: "Each",
	ROLL: "Rolls",
}

/**
 * One line, editable in place.
 *
 * The figure shown is what the dealer typed — "1200 sq ft" — with the boxes it
 * became underneath. Showing only the box count would be honest but disorienting:
 * somebody who asked for 1,200 square feet should be able to find 1,200 on the
 * screen.
 */
export function CartLine({ line }: { line: CartLineData }) {
	const [unit, setUnit] = useState(line.unitSelected)
	const [quantity, setQuantity] = useState(line.qtyEntered)
	const [pending, startTransition] = useTransition()

	const dirty = unit !== line.unitSelected || quantity !== line.qtyEntered

	function save() {
		startTransition(async () => {
			const result = await updateLineAction({ itemId: line.id, unit, quantity })
			if (result.ok) toast.success(result.message)
			else toast.error(result.message)
		})
	}

	function remove() {
		startTransition(async () => {
			const result = await removeLineAction({ itemId: line.id })
			if (result.ok) toast.success(result.message)
			else toast.error(result.message)
		})
	}

	return (
		<li className="grid gap-4 border-b py-4 sm:grid-cols-[4rem_1fr_auto]">
			<div className="bg-muted relative size-16 overflow-hidden rounded">
				{line.image && (
					<Image src={line.image} alt="" fill sizes="64px" className="object-cover" />
				)}
			</div>

			<div className="min-w-0">
				<p className="font-medium">{line.name}</p>
				<p className="text-muted-foreground font-mono text-xs">
					{line.sku} · {line.seriesName} ·{" "}
					{formatUnitPrice(line.unitPrice, line.pricingUom)}
				</p>

				<div className="mt-3 flex flex-wrap items-center gap-2">
					<Input
						value={quantity}
						onChange={(event) => setQuantity(event.target.value)}
						inputMode="decimal"
						aria-label={`Quantity of ${line.name}`}
						className="w-24"
						disabled={pending}
					/>
					<select
						value={unit}
						onChange={(event) => setUnit(event.target.value)}
						aria-label={`Unit for ${line.name}`}
						disabled={pending}
						className="border-input h-9 rounded-md border bg-transparent px-2 text-sm"
					>
						{line.orderUoms.map((option) => (
							<option key={option} value={option}>
								{UNIT_LABEL[option] ?? option}
							</option>
						))}
					</select>
					{dirty && (
						<Button type="button" size="sm" onClick={save} disabled={pending}>
							Update
						</Button>
					)}
				</div>

				{(line.boxes !== null || line.sqFt) && (
					<p className="text-muted-foreground mt-2 text-xs">
						Ships as{" "}
						<span className="text-foreground">
							{line.boxes !== null && `${line.boxes} ${line.boxes === 1 ? "box" : "boxes"}`}
						</span>
						{line.sqFt && <> · {formatCoverage(line.sqFt)} sq ft covered</>}
					</p>
				)}
			</div>

			<div className="flex items-start justify-between gap-4 sm:flex-col sm:items-end">
				<p className="font-medium">{formatMoney(line.lineTotal)}</p>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={remove}
					disabled={pending}
					aria-label={`Remove ${line.name}`}
				>
					<Trash2Icon aria-hidden />
					Remove
				</Button>
			</div>
		</li>
	)
}
