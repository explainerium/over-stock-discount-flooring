"use client"

import { useMemo, useState } from "react"

import { formatCoverage } from "@/lib/format/coverage"
import { resolve } from "@/server/domain/uom"

/**
 * How much floor do you need?
 *
 * This sits in the hero rather than in a resources section, which is a
 * deliberate departure from the reference site. The client's largest daily
 * drain is people asking him for numbers he works out by hand, and the single
 * most concrete thing he said in the whole brief was his own worked example:
 * "if someone types in 1200 square feet. It rounds to 51 boxes 1205 sf."
 *
 * Leading with the machine that answers that is the site doing his job, and it
 * is the only thing on the page that does anything — without it this is a
 * better-looking brochure.
 *
 * The arithmetic is the same engine the dealer portal, the cart, the admin
 * order editor and the invoice all use. It is a pure module with no server
 * imports, which is what lets a client component call it directly; nothing in
 * `server/domain/` may take that away.
 */
export interface CalculatorSeries {
	slug: string
	name: string
	/** As a string: it crosses the server/client boundary and must not become a float. */
	sqFtPerBox: string
	boxesPerPallet: number
}

export function CoverageCalculator({ series: SERIES }: { series: CalculatorSeries[] }) {
	const [input, setInput] = useState("1200")
	// Defaults to the last in sort order, which is the top of the range whatever
	// the client ends up calling it. Falls back to an empty string so the hooks
	// below run unconditionally even when nothing has been published yet.
	const [seriesSlug, setSeriesSlug] = useState(SERIES.at(-1)?.slug ?? "")
	const [waste, setWaste] = useState(0)

	const series = SERIES.find((s) => s.slug === seriesSlug) ?? SERIES.at(-1)

	const result = useMemo(() => {
		if (!series) return null

		const sqFt = Number(input)
		if (!Number.isFinite(sqFt) || sqFt <= 0) return null

		try {
			return resolve(
				{
					pricingUom: "SQFT",
					orderUoms: ["SQFT", "BOX", "PALLET"],
					sqFtPerBox: series.sqFtPerBox,
					boxesPerPallet: series.boxesPerPallet,
				},
				"SQFT",
				sqFt,
				waste,
			)
		} catch {
			return null
		}
	}, [input, series, waste])

	// Guarded after the hooks, never before: an early return above a useState is
	// a rules-of-hooks violation waiting for the first empty catalog.
	if (!series) return null

	return (
		<div className="bg-band text-ink">
			<div className="border-rule border-b px-7 py-5">
				<h2 className="display text-base uppercase">Coverage calculator</h2>
				<p className="text-muted-foreground mt-1 text-xs">
					Enter your square footage. We round up to whole boxes, because that is how it
					ships.
				</p>
			</div>

			<div className="grid gap-5 px-7 py-6">
				<label className="grid gap-2">
					<span className="text-muted-foreground display text-[0.65rem] tracking-widest uppercase">
						Square feet
					</span>
					<input
						type="number"
						inputMode="decimal"
						min={1}
						value={input}
						onChange={(event) => setInput(event.target.value)}
						className="display border-rule focus-visible:border-ink w-full min-w-0 appearance-none border-b-2 bg-transparent px-0 py-1 text-3xl outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
						aria-label="Square feet needed"
					/>
				</label>

				{/* Three across was right when Bronze, Silver and Gold were the whole
				    catalog. The client is bringing more lines, and a fixed three
				    would either squash them or leave a ragged last row — so the
				    track count comes from how many fit at a readable width, in this
				    box and in the wider one on the resources page alike. */}
				<div
					className="grid gap-px [grid-template-columns:repeat(auto-fit,minmax(6.5rem,1fr))]"
					role="group"
					aria-label="Series"
				>
					{SERIES.map((option) => {
						const active = option.slug === series.slug
						return (
							<button
								key={option.slug}
								type="button"
								onClick={() => setSeriesSlug(option.slug)}
								aria-pressed={active}
								className={`display border px-2 py-2 text-[0.65rem] tracking-widest uppercase transition-colors ${
									active
										? "border-ink bg-ink text-paper"
										: "border-rule text-muted-foreground hover:border-ink/40 hover:text-ink"
								}`}
							>
								{option.name}
							</button>
						)
					})}
				</div>

				{/* The padding is the tap target, not decoration: "0%" set as 12px
				    text is a 19×16 box, and this is a calculator people use on a
				    phone. The negative margin puts the first label back on the
				    same optical line as the field above it, so the row looks
				    unchanged while each button is comfortably hittable. */}
				<div className="-my-2 flex items-center gap-1">
					<span className="text-muted-foreground display mr-2 text-[0.65rem] tracking-widest uppercase">
						Waste
					</span>
					{[0, 5, 10].map((option) => (
						<button
							key={option}
							type="button"
							onClick={() => setWaste(option)}
							aria-pressed={waste === option}
							className={`display px-2 py-2 text-xs underline-offset-4 transition-colors ${
								waste === option
									? "text-ink underline"
									: "text-muted-foreground hover:text-ink"
							}`}
						>
							{option}%
						</button>
					))}
				</div>
			</div>

			<output className="bg-ink text-paper block px-7 py-6">
				{result ? (
					<>
						<p className="display text-3xl font-extrabold">
							{result.boxes} <span className="font-light">boxes</span>
						</p>
						<p className="display mt-1 text-xs opacity-70">
							{formatCoverage(result.coverageSqFt!)} sq ft covered ·{" "}
							{series.sqFtPerBox} sq ft a box
						</p>
					</>
				) : (
					<p className="display text-xs opacity-70">Enter a figure above.</p>
				)}
			</output>
		</div>
	)
}
