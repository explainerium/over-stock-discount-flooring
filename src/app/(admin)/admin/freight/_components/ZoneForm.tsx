"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { FormError, ProForm, ProInput, ProSubmit } from "@/components/form"
import { zoneFormSchema, type ZoneFormInput } from "@/lib/validation/freight"
import { saveZoneAction } from "../_actions"

export interface ZoneValues extends ZoneFormInput {
	id?: string
}

/**
 * One row of the rate table.
 *
 * The same form adds a zone and edits one — the fields are identical and the
 * only difference is whether an id goes up with them.
 *
 * Everything except the name is optional on purpose. The owner will build this
 * table over weeks as the manufacturer and the carrier give him numbers, and a
 * form that refuses a half-known zone is a form he stops using. A zone with no
 * rates yet is flagged in the list instead.
 */
export function ZoneForm({ zone }: { zone?: ZoneValues }) {
	const router = useRouter()
	const [error, setError] = useState<string | null>(null)

	async function onSubmit(values: ZoneFormInput) {
		setError(null)
		const result = await saveZoneAction({ ...values, ...(zone?.id ? { id: zone.id } : {}) })

		if (!result.ok) {
			setError(result.message)
			return
		}
		toast.success(result.message ?? "Saved.")
		if (zone?.id) router.refresh()
		else router.push(`/admin/freight/${result.data!.id}`)
	}

	return (
		<ProForm<ZoneFormInput>
			onSubmit={onSubmit}
			resolver={zodResolver(zoneFormSchema)}
			defaultValues={{
				name: zone?.name ?? "",
				states: zone?.states ?? "",
				zips: zone?.zips ?? "",
				perPalletRate: zone?.perPalletRate ?? "",
				perBoxRate: zone?.perBoxRate ?? "",
				minCharge: zone?.minCharge ?? "",
				ftlThresholdPallets: zone?.ftlThresholdPallets ?? "",
				ftlRate: zone?.ftlRate ?? "",
			}}
			className="grid gap-4"
		>
			<FormError message={error} />

			<ProInput name="name" label="Zone name" required autoFocus />

			<ProInput
				name="states"
				label="States"
				placeholder="NC, SC, VA"
				description="Two-letter codes, separated by commas."
			/>

			<ProInput
				name="zips"
				label="ZIPs"
				placeholder="27, 28, 27260"
				description="Full ZIPs or the first digits of a range. A longer entry wins over a shorter one, so 27260 can price differently from the rest of 27."
			/>

			<div className="grid gap-4 sm:grid-cols-2">
				<ProInput
					name="perPalletRate"
					label="Per pallet"
					description="Used first where the order made pallets."
				/>
				<ProInput name="perBoxRate" label="Per box" description="Used when it did not." />
			</div>

			<ProInput
				name="minCharge"
				label="Minimum charge"
				description="The floor for the lane. Accessorials are charged on top of it, the way a carrier bills them."
			/>

			<div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
				<ProInput
					name="ftlThresholdPallets"
					label="Truckload from"
					placeholder="8"
					description="Pallets. Past this a per-pallet rate badly overquotes."
				/>
				<ProInput
					name="ftlRate"
					label="Truckload rate"
					description="Leave empty to send those orders for a manual quote instead."
				/>
			</div>

			<ProSubmit className="justify-self-start">
				{zone?.id ? "Save zone" : "Add zone"}
			</ProSubmit>
		</ProForm>
	)
}
