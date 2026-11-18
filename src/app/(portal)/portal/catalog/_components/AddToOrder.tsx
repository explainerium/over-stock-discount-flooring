"use client"

import Decimal from "decimal.js"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatCoverage } from "@/lib/format/coverage"
import { formatMoney } from "@/lib/format/money"
import { lineTotal } from "@/server/domain/pricing"
import { UomError, resolve, type Uom } from "@/server/domain/uom"
import { addLineAction } from "../../_actions"

export interface OrderableProduct {
	id: string
	name: string
	sku: string
	pricingUom: string
	orderUoms: string[]
	unitPrice: string | null
	sqFtPerBox: string | null
	boxesPerPallet: number | null
	lbPerBox: string | null
	lfPerPiece: string | null
}

const UNIT_LABEL: Record<string, string> = {
	SQFT: "Sq ft",
	BOX: "Boxes",
	PALLET: "Pallets",
	LF: "Linear ft",
	STICK: "Pieces",
	BUNDLE: "Bundles",
	EACH: "Each",
	ROLL: "Rolls",
}

/**
 * Adding a line, with the answer shown before it is added.
 *
 * The dealer picks a unit and types a figure, and the box count, coverage and
 * line total appear as they type. This is the client's own example working:
 * type 1,200 square feet of Gold and see "51 boxes / 1,205 sq ft" before
 * committing to anything.
 *
 * The preview runs the same UOM and pricing engines the server does — they are
 * pure modules with no server imports, which is exactly why they can be called
 * from here. The server recomputes on submit regardless; this is a preview, and
 * if the two ever disagree the server is right.
 */
export function AddToOrder({ product }: { product: OrderableProduct }) {
	const [unit, setUnit] = useState<Uom>((product.orderUoms[0] as Uom) ?? "EACH")
	const [quantity, setQuantity] = useState("")
	const [waste, setWaste] = useState(0)
	const [pending, startTransition] = useTransition()

	/** Discriminated on purpose — `"conversion" in preview` does not narrow a
	 *  union of object literals the way an explicit tag does. */
	type Preview =
		| { ok: true; conversion: ReturnType<typeof resolve>; total: ReturnType<typeof lineTotal> }
		| { ok: false; message: string }

	const preview = useMemo<Preview | null>(() => {
		if (!quantity.trim() || !product.unitPrice) return null

		try {
			const conversion = resolve(
				{
					pricingUom: product.pricingUom as Uom,
					orderUoms: product.orderUoms as Uom[],
					sqFtPerBox: product.sqFtPerBox ?? undefined,
					boxesPerPallet: product.boxesPerPallet ?? undefined,
					lbPerBox: product.lbPerBox ?? undefined,
					lfPerStick: product.lfPerPiece ?? undefined,
				},
				unit,
				quantity,
				waste,
			)
			return {
				ok: true as const,
				conversion,
				total: lineTotal(product.unitPrice, conversion.billableQty),
			}
		} catch (error) {
			// A half-typed figure is not an error worth shouting about; the message
			// only appears once it is a real problem, like a unit this product is
			// not sold in.
			return error instanceof UomError && error.code === "UOM_NOT_ALLOWED"
				? { ok: false as const, message: error.message }
				: null
		}
	}, [product, unit, quantity, waste])

	const showsWaste = product.orderUoms.includes("SQFT") && unit === "SQFT"

	function add() {
		startTransition(async () => {
			const result = await addLineAction({
				productId: product.id,
				unit,
				quantity,
				wasteFactorPct: waste,
			})
			if (result.ok) {
				toast.success(result.message)
				setQuantity("")
			} else {
				toast.error(result.message)
			}
		})
	}

	if (!product.unitPrice) {
		return (
			<p className="text-muted-foreground text-xs">
				No price set — ask us and we will sort it out.
			</p>
		)
	}

	return (
		<div className="grid gap-3">
			<div className="flex flex-wrap gap-1">
				{product.orderUoms.map((option) => (
					<button
						key={option}
						type="button"
						onClick={() => setUnit(option as Uom)}
						aria-pressed={unit === option}
						className={`rounded border px-2.5 py-1 text-xs transition-colors ${
							unit === option
								? "border-foreground bg-foreground text-background"
								: "hover:border-foreground/40 text-muted-foreground"
						}`}
					>
						{UNIT_LABEL[option] ?? option}
					</button>
				))}
			</div>

			<div className="flex gap-2">
				<Input
					value={quantity}
					onChange={(event) => setQuantity(event.target.value)}
					placeholder={UNIT_LABEL[unit] ?? unit}
					inputMode="decimal"
					aria-label={`${UNIT_LABEL[unit] ?? unit} of ${product.name}`}
					disabled={pending}
				/>
				<Button type="button" onClick={add} disabled={!quantity.trim() || pending}>
					Add
				</Button>
			</div>

			{showsWaste && (
				<div className="text-muted-foreground flex items-center gap-3 text-xs">
					<span>Waste</span>
					{[0, 5, 10].map((option) => (
						<button
							key={option}
							type="button"
							onClick={() => setWaste(option)}
							aria-pressed={waste === option}
							className={
								waste === option
									? "text-foreground underline underline-offset-4"
									: "hover:text-foreground"
							}
						>
							{option}%
						</button>
					))}
				</div>
			)}

			{preview && !preview.ok && (
				<p className="text-destructive text-xs">{preview.message}</p>
			)}

			{preview?.ok && (
				<p className="bg-muted rounded px-3 py-2 text-xs">
					<span className="font-medium">
						{preview.conversion.boxes !== undefined
							? `${preview.conversion.boxes} ${preview.conversion.boxes === 1 ? "box" : "boxes"}`
							: `${new Decimal(preview.conversion.sellableQty).toString()} ${
									UNIT_LABEL[preview.conversion.sellableUom]?.toLowerCase() ??
									preview.conversion.sellableUom.toLowerCase()
								}`}
					</span>
					{preview.conversion.coverageSqFt && (
						<> · {formatCoverage(preview.conversion.coverageSqFt)} sq ft</>
					)}
					{/* Pieces are what ships, feet are what is billed: both, or the
					    total looks wrong against the price per foot. */}
					{preview.conversion.sellableUom === "STICK" && (
						<> · {new Decimal(preview.conversion.billableQty).toString()} linear ft</>
					)}
					{" · "}
					<span className="font-medium">{formatMoney(preview.total)}</span>
				</p>
			)}
		</div>
	)
}
