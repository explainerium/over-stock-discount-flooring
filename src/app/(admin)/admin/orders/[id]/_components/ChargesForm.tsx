"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { toast } from "sonner"
import { FormError, ProForm, ProInput, ProSubmit, ProTextarea } from "@/components/form"
import { orderChargesFormSchema, type OrderChargesFormInput } from "@/lib/validation/orders"
import { setOrderChargesAction } from "../../_actions"

/**
 * Freight, tax and the owner's own note.
 *
 * Freight is typed in by hand. A rated engine behind a carrier API is in the
 * plan, but he quotes these himself today, and an order that cannot be approved
 * until an integration exists is worse than a text field.
 *
 * The internal note is on the same form because it is written at the same
 * moment — "spoke to Mike, he'll take the Silver W" belongs with the freight
 * figure that conversation produced.
 */
export function ChargesForm({
	orderId,
	freight,
	tax,
	internalNotes,
	weightLb,
	palletCount,
}: {
	orderId: string
	freight: string
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
