"use client"

import { SearchIcon, XIcon } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { cn } from "@/lib/utils"

export interface CatalogControlsProps {
	wearLayers: number[]
	thicknesses: string[]
	resultCount: number
}

/**
 * Search, specs and sort.
 *
 * Everything lives in the query string rather than in component state, for the
 * same reason the series filter does: a filtered view is a page somebody sends
 * to somebody else. "The 20 mil ones" has to survive being pasted into a text
 * message.
 *
 * Tone is not offered. The plan lists it, but there is no tone on any product —
 * classifying sixty-two colours as light or dark would be us inventing product
 * data, and a filter built on a guess is worse than one that is absent.
 */
export function CatalogControls({ wearLayers, thicknesses, resultCount }: CatalogControlsProps) {
	const router = useRouter()
	const params = useSearchParams()
	const [pending, startTransition] = useTransition()

	const [search, setSearch] = useState(params.get("q") ?? "")

	// Typing should not put a history entry on every keystroke, and it should
	// not fire a query on every keystroke either.
	useEffect(() => {
		const current = params.get("q") ?? ""
		if (search === current) return

		const timer = setTimeout(() => {
			const next = new URLSearchParams(params.toString())
			if (search.trim()) next.set("q", search.trim())
			else next.delete("q")
			startTransition(() => router.replace(`/products?${next}`, { scroll: false }))
		}, 300)

		return () => clearTimeout(timer)
	}, [search, params, router])

	function set(key: string, value: string | null) {
		const next = new URLSearchParams(params.toString())
		if (value) next.set(key, value)
		else next.delete(key)
		startTransition(() => router.replace(`/products?${next}`, { scroll: false }))
	}

	const wear = params.get("wear")
	const thickness = params.get("thickness")
	const sort = params.get("sort") ?? "curated"
	const filtered = Boolean(search || wear || thickness || params.get("series"))

	const chip = "display px-3 py-1.5 text-xs uppercase transition-colors"
	const chipOff = "border-rule text-ink border hover:bg-band"

	return (
		<div className="border-rule grid gap-4 border-b py-4">
			{/*
			  Both controls below are 16px on a phone and 14px from md up, which is
			  what Input and Textarea already do. Mobile Safari zooms the viewport
			  when a focused control computes under 16px, and it does not zoom back
			  out afterwards — tapping search left you on a magnified page that now
			  scrolls sideways.
			*/}
			<div className="flex flex-wrap items-center gap-3">
				<label className="relative flex-1 sm:max-w-xs">
					<SearchIcon
						className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
						aria-hidden
					/>
					<input
						type="search"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Colour name or SKU"
						aria-label="Search the catalogue"
						className="border-rule focus-visible:border-ink w-full border py-2 pr-3 pl-9 text-base outline-none md:text-sm"
					/>
				</label>

				<label className="flex items-center gap-2 text-xs">
					<span className="display text-muted-foreground uppercase">Sort</span>
					<select
						value={sort}
						onChange={(event) =>
							set(
								"sort",
								event.target.value === "curated" ? null : event.target.value,
							)
						}
						className="border-rule text-ink border bg-transparent px-2 py-2 text-base md:text-sm"
					>
						<option value="curated">Our order</option>
						<option value="series">By series, then name</option>
						<option value="name">Name, A–Z</option>
					</select>
				</label>
			</div>

			{(wearLayers.length > 1 || thicknesses.length > 1) && (
				<div className="flex flex-wrap items-center gap-x-6 gap-y-3">
					{wearLayers.length > 1 && (
						<div className="flex flex-wrap items-center gap-2">
							<span className="display text-muted-foreground text-xs uppercase">
								Wear layer
							</span>
							{wearLayers.map((mil) => (
								<button
									key={mil}
									type="button"
									onClick={() =>
										set("wear", wear === String(mil) ? null : String(mil))
									}
									className={cn(
										chip,
										wear === String(mil) ? "bg-ink text-paper" : chipOff,
									)}
								>
									{mil} mil
								</button>
							))}
						</div>
					)}

					{thicknesses.length > 1 && (
						<div className="flex flex-wrap items-center gap-2">
							<span className="display text-muted-foreground text-xs uppercase">
								Thickness
							</span>
							{thicknesses.map((mm) => (
								<button
									key={mm}
									type="button"
									onClick={() => set("thickness", thickness === mm ? null : mm)}
									className={cn(
										chip,
										thickness === mm ? "bg-ink text-paper" : chipOff,
									)}
								>
									{mm} mm
								</button>
							))}
						</div>
					)}
				</div>
			)}

			{filtered && (
				<div className="flex flex-wrap items-center gap-3 text-xs">
					<span className={cn("text-muted-foreground", pending && "opacity-50")}>
						{resultCount} {resultCount === 1 ? "colour" : "colours"}
					</span>
					<button
						type="button"
						onClick={() => {
							setSearch("")
							startTransition(() => router.replace("/products", { scroll: false }))
						}}
						className="text-muted-foreground hover:text-ink flex items-center gap-1 underline-offset-4 hover:underline"
					>
						<XIcon className="size-3" aria-hidden />
						Clear
					</button>
				</div>
			)}
		</div>
	)
}
