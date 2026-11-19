"use client"

import { SearchIcon, XIcon } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { Input } from "@/components/ui/input"

/**
 * Finding one color among sixty-two.
 *
 * A counter person taking an order over the phone knows the name the customer
 * said, or the SKU off a sample. Scrolling a grid to find it is the difference
 * between using the portal and picking the phone up.
 *
 * Filtered on the server through the query string, not in the browser, because
 * the list carries dealer pricing — filtering client-side would mean shipping
 * every price to the page whether or not it is shown.
 */
export function CatalogSearch({ resultCount, total }: { resultCount: number; total: number }) {
	const router = useRouter()
	const params = useSearchParams()
	const [pending, startTransition] = useTransition()
	const [value, setValue] = useState(params.get("q") ?? "")

	useEffect(() => {
		const current = params.get("q") ?? ""
		if (value === current) return

		const timer = setTimeout(() => {
			const next = new URLSearchParams(params.toString())
			if (value.trim()) next.set("q", value.trim())
			else next.delete("q")
			startTransition(() => router.replace(`/portal/catalog?${next}`, { scroll: false }))
		}, 250)

		return () => clearTimeout(timer)
	}, [value, params, router])

	const searching = Boolean(params.get("q"))

	return (
		<div className="grid gap-2">
			<label className="relative block max-w-sm">
				<SearchIcon
					className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
					aria-hidden
				/>
				<Input
					type="search"
					value={value}
					onChange={(event) => setValue(event.target.value)}
					placeholder="Color name or SKU"
					aria-label="Search the catalog"
					className="pl-9"
				/>
			</label>

			{searching && (
				<p className="text-muted-foreground flex items-center gap-3 text-xs">
					<span className={pending ? "opacity-50" : undefined}>
						{resultCount} of {total}
					</span>
					<button
						type="button"
						onClick={() => {
							setValue("")
							startTransition(() =>
								router.replace("/portal/catalog", { scroll: false }),
							)
						}}
						className="hover:text-foreground flex items-center gap-1 underline-offset-4 hover:underline"
					>
						<XIcon className="size-3" aria-hidden />
						Clear
					</button>
				</p>
			)}
		</div>
	)
}
