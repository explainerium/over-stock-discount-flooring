"use client"

import Decimal from "decimal.js"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatUnitPrice } from "@/lib/format/money"
import { setDealerSeriesPriceAction } from "../_actions"

export interface SeriesPriceRow {
	seriesId: string
	name: string
	colors: number
	/** This dealer's price per square foot on the series, or "" for none. */
	price: string
}

/**
 * One price per series for this dealer — how the client prices flooring.
 *
 * Five rows instead of seventy-eight: every color in a series takes the
 * series price, and so does any color added to it later. A row at a time, like
 * the product table, so changing one series never rewrites the others.
 */
export function SeriesPricingTable({
	dealerId,
	rows,
}: {
	dealerId: string
	rows: SeriesPriceRow[]
}) {
	if (rows.length === 0) {
		return <p className="text-muted-foreground text-sm">No flooring series yet.</p>
	}
	return (
		<div className="grid gap-1">
			{rows.map((row) => (
				<SeriesPriceRowForm key={row.seriesId} dealerId={dealerId} row={row} />
			))}
		</div>
	)
}

function SeriesPriceRowForm({ dealerId, row }: { dealerId: string; row: SeriesPriceRow }) {
	const [price, setPrice] = useState(row.price)
	const [pending, startTransition] = useTransition()
	const dirty = price !== row.price

	const preview = (() => {
		if (!price.trim()) return null
		try {
			return formatUnitPrice(new Decimal(price), "SQFT")
		} catch {
			return null
		}
	})()

	function send(value: string) {
		startTransition(async () => {
			const result = await setDealerSeriesPriceAction({
				dealerId,
				seriesId: row.seriesId,
				price: value.trim() || undefined,
			})
			if (result.ok) toast.success(result.message)
			else toast.error(result.message)
		})
	}

	return (
		<div className="hover:bg-muted/40 grid gap-3 rounded-md border px-4 py-3 sm:grid-cols-[1fr_8rem_10rem_auto] sm:items-center">
			<div className="min-w-0">
				<p className="truncate text-sm font-medium">{row.name}</p>
				<p className="text-muted-foreground text-xs">
					{row.colors} {row.colors === 1 ? "color" : "colors"}
				</p>
			</div>

			<Input
				value={price}
				onChange={(event) => setPrice(event.target.value)}
				placeholder="Per sq ft"
				inputMode="decimal"
				aria-label={`Price per square foot for ${row.name}`}
				disabled={pending}
			/>

			<p className="text-sm">
				{preview ? (
					<span className="font-medium">{preview}</span>
				) : (
					<span className="text-muted-foreground text-xs">Not set</span>
				)}
			</p>

			<div className="flex gap-2">
				<Button
					type="button"
					size="sm"
					onClick={() => send(price)}
					disabled={!dirty || pending}
				>
					Save
				</Button>
				{row.price && (
					<Button
						type="button"
						size="sm"
						variant="ghost"
						onClick={() => {
							setPrice("")
							send("")
						}}
						disabled={pending}
					>
						Clear
					</Button>
				)}
			</div>
		</div>
	)
}
