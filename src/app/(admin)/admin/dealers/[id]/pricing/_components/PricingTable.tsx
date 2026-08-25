"use client"

import Decimal from "decimal.js"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatUnitPrice } from "@/lib/format/money"
import { setDealerPriceAction } from "../_actions"

export interface PricingRow {
	productId: string
	name: string
	sku: string
	seriesName: string
	pricingUom: string
	listPrice: string | null
	price: string
	discountPct: string
}

/** What a product falls back to when it has no exception of its own. */
export interface Fallback {
	pct: string | null
	/** Which of the two it came from — they are different things to the owner. */
	label: "flat rate" | "tier"
}

/**
 * Setting one dealer's exceptions.
 *
 * A row at a time rather than one big form, because the owner will edit two or
 * three products out of sixty-five and a form that submits all of them turns
 * every small change into a full rewrite of his pricing.
 *
 * The resulting price is shown live as he types. Per-square-foot pricing is
 * abstract enough that "$1.86" means less than "$1.86 a square foot" — and this
 * is the screen where a typo becomes a wrong invoice.
 */
export function PricingTable({
	dealerId,
	rows,
	fallback,
}: {
	dealerId: string
	rows: PricingRow[]
	fallback: Fallback
}) {
	return (
		<div className="grid gap-1">
			{rows.map((row) => (
				<PricingRowForm
					key={row.productId}
					dealerId={dealerId}
					row={row}
					fallback={fallback}
				/>
			))}
		</div>
	)
}

function PricingRowForm({
	dealerId,
	row,
	fallback,
}: {
	dealerId: string
	row: PricingRow
	fallback: Fallback
}) {
	const [price, setPrice] = useState(row.price)
	const [discount, setDiscount] = useState(row.discountPct)
	const [pending, startTransition] = useTransition()

	const dirty = price !== row.price || discount !== row.discountPct

	/**
	 * What this dealer would actually pay, given what is typed.
	 *
	 * Mirrors the precedence in the engine rather than calling it — the engine
	 * lives on the server and this needs to update on every keystroke. If the
	 * two ever disagree the engine is right; this is a preview.
	 */
	const effective = (() => {
		if (!row.listPrice) return null
		const list = new Decimal(row.listPrice)

		if (price.trim()) {
			try {
				return new Decimal(price)
			} catch {
				return null
			}
		}
		const pct = discount.trim() || fallback.pct
		if (!pct) return list

		try {
			return list.times(new Decimal(100).minus(pct)).dividedBy(100).toDecimalPlaces(4)
		} catch {
			return null
		}
	})()

	function save() {
		startTransition(async () => {
			const result = await setDealerPriceAction({
				dealerId,
				productId: row.productId,
				price: price.trim() || undefined,
				discountPct: discount.trim() || undefined,
			})
			if (result.ok) toast.success(result.message)
			else toast.error(result.message)
		})
	}

	function clear() {
		setPrice("")
		setDiscount("")
		startTransition(async () => {
			const result = await setDealerPriceAction({
				dealerId,
				productId: row.productId,
				price: undefined,
				discountPct: undefined,
			})
			if (result.ok) toast.success(result.message)
			else toast.error(result.message)
		})
	}

	return (
		<div className="hover:bg-muted/40 grid gap-3 rounded-md border px-4 py-3 sm:grid-cols-[1fr_7rem_7rem_10rem_auto] sm:items-center">
			<div className="min-w-0">
				<p className="truncate text-sm font-medium">{row.name}</p>
				<p className="text-muted-foreground truncate font-mono text-xs">
					{row.sku} · {row.seriesName} ·{" "}
					{row.listPrice
						? formatUnitPrice(row.listPrice, row.pricingUom)
						: "no list price"}
				</p>
			</div>

			<Input
				value={price}
				onChange={(event) => setPrice(event.target.value)}
				placeholder="Price"
				inputMode="decimal"
				aria-label={`Price for ${row.name}`}
				disabled={pending}
			/>
			<Input
				value={discount}
				onChange={(event) => setDiscount(event.target.value)}
				placeholder="% off"
				inputMode="decimal"
				aria-label={`Discount for ${row.name}`}
				disabled={pending}
			/>

			<p className="text-muted-foreground text-sm">
				{effective ? (
					<>
						<span className="text-foreground font-medium">
							{formatUnitPrice(effective, row.pricingUom)}
						</span>
						{!price.trim() && !discount.trim() && fallback.pct && (
							<span className="ml-1 text-xs">({fallback.label})</span>
						)}
					</>
				) : (
					<span className="text-xs">—</span>
				)}
			</p>

			<div className="flex gap-2">
				<Button type="button" size="sm" onClick={save} disabled={!dirty || pending}>
					Save
				</Button>
				{(row.price || row.discountPct) && (
					<Button
						type="button"
						size="sm"
						variant="ghost"
						onClick={clear}
						disabled={pending}
					>
						Clear
					</Button>
				)}
			</div>
		</div>
	)
}
