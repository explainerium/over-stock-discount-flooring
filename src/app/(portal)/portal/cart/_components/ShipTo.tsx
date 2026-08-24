"use client"

import Link from "next/link"
import { useTransition } from "react"
import { toast } from "sonner"
import { accessorialsOf, addressLines, addressName } from "@/server/domain/addresses"
import { setShipToAction } from "../../_actions"

export interface ShipToOption {
	id: string
	label: string | null
	line1: string
	line2: string | null
	city: string
	state: string
	zip: string
	isResidential: boolean
	needsLiftgate: boolean
	limitedAccess: boolean
}

/**
 * Where the order is going.
 *
 * A radio list rather than a dropdown. Most dealers have two or three places
 * and the accessorials have to be readable without opening anything — those
 * flags are what the freight quote turns on, and a dealer who picks the wrong
 * one finds out at approval.
 */
export function ShipTo({
	addresses,
	selectedId,
}: {
	addresses: ShipToOption[]
	selectedId: string | null
}) {
	const [pending, startTransition] = useTransition()

	function choose(addressId: string) {
		startTransition(async () => {
			const result = await setShipToAction({ addressId })
			if (!result.ok) toast.error(result.message)
		})
	}

	if (addresses.length === 0) {
		return (
			<p className="text-sm">
				We have nowhere to send this yet.{" "}
				<Link href="/portal/addresses" className="underline underline-offset-4">
					Add a delivery address
				</Link>{" "}
				and it will be waiting here.
			</p>
		)
	}

	return (
		<fieldset className="grid gap-2" disabled={pending}>
			<legend className="sr-only">Delivery address</legend>

			{addresses.map((address) => {
				const extras = accessorialsOf(address)
				const checked = address.id === selectedId

				return (
					<label
						key={address.id}
						className="hover:bg-muted/50 flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors has-checked:border-foreground"
					>
						<input
							type="radio"
							name="shipTo"
							value={address.id}
							checked={checked}
							onChange={() => choose(address.id)}
							className="mt-1"
						/>
						<span className="grid gap-0.5 text-sm">
							<span className="font-medium">{addressName(address)}</span>
							<span className="text-muted-foreground">
								{addressLines(address).join(", ")}
							</span>
							{extras.length > 0 && (
								<span className="text-xs">{extras.join(" · ")}</span>
							)}
						</span>
					</label>
				)
			})}

			{!selectedId && <p className="text-sm">Pick one before you send the order.</p>}

			<Link
				href="/portal/addresses"
				className="text-muted-foreground hover:text-foreground justify-self-start text-xs underline-offset-4 hover:underline"
			>
				Manage addresses
			</Link>
		</fieldset>
	)
}
