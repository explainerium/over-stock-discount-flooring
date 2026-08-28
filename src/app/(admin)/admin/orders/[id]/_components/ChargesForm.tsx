"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { toast } from "sonner"
import { FormError, ProForm, ProInput, ProSubmit, ProTextarea } from "@/components/form"
import { orderChargesFormSchema, type OrderChargesFormInput } from "@/lib/validation/orders"
import { setOrderChargesAction } from "../../_actions"

/** Where the figure in the box came from, said plainly. */
const SOURCE_NOTE: Record<string, string> = {
	ZONE: "Rated from the zone table.",
	FLAT: "This dealer's flat rate.",
	MANUAL: "You set this figure by hand.",
	TQL: "Quoted live by the carrier.",
}

/**
 * Freight, tax and the owner's own note.
 *
 * Freight arrives rated where the zone table covers the destination, and blank
 * where it does not. Either way it stays a field he can overwrite: he knows
 * what the carrier actually quoted him, and a number he cannot argue with is a
 * screen he stops trusting. Saving here marks the figure MANUAL, and a
 * resubmission will not rate over the top of it.
 *
 * The internal note is on the same form because it is written at the same
 * moment — "spoke to Mike, he'll take the Silver W" belongs with the freight
 * figure that conversation produced.
 */
export function ChargesForm({
	orderId,
	freight,
	freightSource,
	tax,
	internalNotes,
	weightLb,
	palletCount,
}: {
	orderId: string
	freight: string
	freightSource: string | null
	tax: string
	internalNotes: string
	weightLb: string | null
	palletCount: number | null
}) {
	const [error, setError] = useState<string | null>(null)

	async function onSubmit(values: OrderChargesFormInput) {
		setError(null)
		const result = await setOrderChargesAction({ ...values, orderId })
		if (result.ok) toast.success(result.message)
		else setError(result.message)
	}

	return (
		<ProForm<OrderChargesFormInput>
			onSubmit={onSubmit}
			resolver={zodResolver(orderChargesFormSchema)}
			defaultValues={{ freight, tax, internalNotes }}
			className="grid gap-4"
		>
			<FormError message={error} />

			{(weightLb || palletCount) && (
				<p className="text-muted-foreground text-sm">
					Quoting on{" "}
					<span className="text-foreground">
						{weightLb && `${Number(weightLb).toLocaleString("en-US")} lb`}
						{weightLb && palletCount ? " · " : ""}
						{palletCount && `${palletCount} pallet${palletCount === 1 ? "" : "s"}`}
					</span>
				</p>
			)}

			{freightSource && SOURCE_NOTE[freightSource] && (
				<p className="text-muted-foreground text-sm">{SOURCE_NOTE[freightSource]}</p>
			)}

			<div className="grid gap-4 sm:grid-cols-2">
				<ProInput name="freight" label="Freight" description="What the carrier quoted." />
				<ProInput name="tax" label="Tax" description="0 for a resale certificate." />
			</div>

			<ProTextarea
				name="internalNotes"
				label="Internal note"
				rows={3}
				description="Only staff see this. The dealer never does."
			/>

			<ProSubmit className="justify-self-start">Save</ProSubmit>
		</ProForm>
	)
}
