"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { toast } from "sonner"
import { FormError, ProCheckbox, ProForm, ProInput, ProSubmit } from "@/components/form"
import { addressSchema, type AddressInput } from "@/lib/validation/addresses"
import { createAddressAction, updateAddressAction } from "../_actions"

export interface AddressFormValues extends AddressInput {
	id?: string
}

/**
 * Adding or editing a delivery address.
 *
 * The accessorials are on this form rather than on the order because they are
 * facts about the place: a jobsite with no dock needs a liftgate every time
 * something goes there, and asking again on each order is both slower and less
 * reliable than recording it once.
 *
 * The id is held in the closure, not in `defaultValues` — react-hook-form does
 * not submit a default for a field it never registered, so an id that only
 * lives there arrives undefined and validation fails on a path with no visible
 * input, leaving a form that silently does nothing.
 */
export function AddressForm({
	address,
	onDone,
}: {
	address?: AddressFormValues
	onDone?: () => void
}) {
	const [error, setError] = useState<string | null>(null)

	async function onSubmit(values: AddressInput) {
		setError(null)
		const result = address?.id
			? await updateAddressAction({ ...values, addressId: address.id })
			: await createAddressAction(values)

		if (result.ok) {
			toast.success(result.message)
			onDone?.()
		} else {
			setError(result.message)
		}
	}

	return (
		<ProForm<AddressInput>
			onSubmit={onSubmit}
			resolver={zodResolver(addressSchema)}
			defaultValues={{
				label: address?.label ?? "",
				line1: address?.line1 ?? "",
				line2: address?.line2 ?? "",
				city: address?.city ?? "",
				state: address?.state ?? "",
				zip: address?.zip ?? "",
				isResidential: address?.isResidential ?? false,
				needsLiftgate: address?.needsLiftgate ?? false,
				limitedAccess: address?.limitedAccess ?? false,
			}}
			className="grid gap-4"
		>
			<FormError message={error} />

			<ProInput
				name="label"
				label="Name it"
				placeholder="Warehouse, Wesley Heights, Mike's jobsite…"
				description="How you will recognise it in a list. Optional."
			/>

			<ProInput name="line1" label="Street address" required />
			<ProInput name="line2" label="Suite, unit, building" />

			<div className="grid gap-4 sm:grid-cols-[1fr_6rem_8rem]">
				<ProInput name="city" label="City" required />
				<ProInput name="state" label="State" placeholder="NC" required />
				<ProInput name="zip" label="ZIP" placeholder="27260" required />
			</div>

			<fieldset className="grid gap-3 border-t pt-4">
				<legend className="sr-only">Delivery conditions</legend>
				<p className="text-muted-foreground text-sm">
					Anything the carrier needs to know. These change what freight costs, so getting
					them right here saves a call later.
				</p>
				<ProCheckbox
					name="isResidential"
					label="Residential"
					description="A house or a street with no commercial dock."
				/>
				<ProCheckbox
					name="needsLiftgate"
					label="Liftgate needed"
					description="No forklift or dock to take a pallet off the truck."
				/>
				<ProCheckbox
					name="limitedAccess"
					label="Limited access"
					description="A narrow road, a gate, restricted hours, or a site the driver has to be let into."
				/>
			</fieldset>

			<ProSubmit className="justify-self-start">
				{address?.id ? "Save changes" : "Add address"}
			</ProSubmit>
		</ProForm>
	)
}
