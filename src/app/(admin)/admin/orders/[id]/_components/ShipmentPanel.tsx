"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { toast } from "sonner"
import { FormError, ProForm, ProInput, ProSubmit } from "@/components/form"
import { Button } from "@/components/ui/button"
import { shipOrderFormSchema, type ShipOrderFormInput } from "@/lib/validation/orders"
import { shipOrderAction } from "../../_actions"

/**
 * What the owner types when a truck leaves.
 *
 * Four fields, one of them required. The dealer's first question is which truck
 * to expect, and their second is a number they can quote at the carrier — so
 * the carrier is compulsory and the rest are there when he has them. A local
 * run in his own truck has no PRO number, and refusing to record that would
 * just mean the order never gets marked shipped.
 */
export function ShipmentPanel({
	orderId,
	onDone,
	onCancel,
}: {
	orderId: string
	onDone: () => void
	onCancel: () => void
}) {
	const [error, setError] = useState<string | null>(null)

	async function onSubmit(values: ShipOrderFormInput) {
		setError(null)
		const result = await shipOrderAction({ ...values, orderId })

		if (result.ok) {
			toast.success(result.message)
			onDone()
		} else {
			setError(result.message)
		}
	}

	return (
		<ProForm<ShipOrderFormInput>
			onSubmit={onSubmit}
			resolver={zodResolver(shipOrderFormSchema)}
			defaultValues={{ carrier: "", proNumber: "", bolNumber: "", trackingUrl: "" }}
			className="grid gap-4"
		>
			<FormError message={error} />

			<div className="grid gap-4 sm:grid-cols-2">
				<ProInput
					name="carrier"
					label="Carrier"
					placeholder="AAA Cooper, Southeastern, our truck…"
					required
					autoFocus
				/>
				<ProInput
					name="proNumber"
					label="PRO number"
					description="If the carrier gave one."
				/>
				<ProInput name="bolNumber" label="BOL number" />
				<ProInput
					name="trackingUrl"
					label="Tracking link"
					placeholder="https://…"
					description="Becomes the button in the dealer's email."
				/>
			</div>

			<p className="text-muted-foreground text-sm">
				The dealer is emailed these details as soon as you save.
			</p>

			<div className="flex flex-col gap-2 sm:flex-row">
				<ProSubmit>Mark shipped</ProSubmit>
				<Button type="button" size="lg" variant="ghost" onClick={onCancel}>
					Back
				</Button>
			</div>
		</ProForm>
	)
}
