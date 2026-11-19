"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { toast } from "sonner"
import {
	FormError,
	ProCheckbox,
	ProForm,
	ProInput,
	ProSubmit,
	ProTextarea,
} from "@/components/form"
import {
	updateSeriesFormSchema,
	type UpdateSeriesFormInput,
	type UpdateSeriesInput,
} from "@/lib/validation/catalog"
import { updateSeriesAction } from "../../../products/_actions"

/**
 * Editing a series edits every color under it.
 *
 * That is the whole point of holding specs here — 62 products, five sets of
 * numbers — but it also means a typo in sq ft per box changes what every dealer
 * is quoted. The fieldsets say so, and the action writes an audit line.
 */
export function EditSeriesForm({
	defaults,
	productCount,
}: {
	defaults: UpdateSeriesInput
	productCount: number
}) {
	const [error, setError] = useState<string | null>(null)

	// The id is passed to the action from the closure; the form never renders it,
	// and the form schema does not know about it.
	const { id, ...formDefaults } = defaults

	/**
	 * The id is merged in here rather than carried in defaultValues.
	 *
	 * react-hook-form does not submit a default for a field that was never
	 * registered, so an id sitting only in defaultValues arrives as undefined —
	 * the schema then fails on a path with no input attached to it, and the form
	 * silently does nothing. An id is context, not something anybody types, so
	 * it belongs in the closure.
	 */
	async function onSubmit(values: UpdateSeriesFormInput) {
		setError(null)
		const result = await updateSeriesAction({ ...values, id })
		if (result.ok) toast.success(result.message ?? "Saved.")
		else setError(result.message)
	}

	return (
		<ProForm<UpdateSeriesFormInput>
			onSubmit={onSubmit}
			resolver={zodResolver(updateSeriesFormSchema)}
			defaultValues={formDefaults}
			className="grid gap-6"
		>
			<FormError message={error} />

			<div className="grid gap-4">
				<ProInput name="name" label="Series name" required />
				<ProTextarea name="blurb" label="Short description" rows={2} />
			</div>

			<fieldset className="grid gap-4 border-t pt-5">
				<legend className="sr-only">Plank</legend>
				<p className="text-muted-foreground text-sm">
					Plank — shared by all {productCount} colors in this series.
				</p>
				<div className="grid gap-4 sm:grid-cols-3">
					<ProInput name="lengthIn" label="Length (in)" />
					<ProInput name="widthIn" label="Width (in)" />
					<ProInput name="thicknessMm" label="Thickness (mm)" />
				</div>
				<div className="grid gap-4 sm:grid-cols-3">
					<ProInput name="wearLayerMil" label="Wear layer (mil)" />
					<ProInput name="finishing" label="Finishing" />
					<ProInput name="edgeProfile" label="Edge" />
				</div>
			</fieldset>

			<fieldset className="grid gap-4 border-t pt-5">
				<legend className="sr-only">Packaging</legend>
				<p className="text-muted-foreground text-sm">
					Packaging — the coverage calculator and every order line run on these.
				</p>
				<div className="grid gap-4 sm:grid-cols-2">
					<ProInput
						name="sqFtPerBox"
						label="Sq ft per box"
						description="Changing this changes what every dealer is quoted."
					/>
					<ProInput name="boxesPerPallet" label="Boxes per pallet" />
				</div>
				<div className="grid gap-4 sm:grid-cols-3">
					<ProInput name="lbPerBox" label="Lb per box" />
					<ProInput name="lbPerPallet" label="Lb per pallet" />
					<ProInput name="palletsPerFtl" label="Pallets per truckload" />
				</div>
			</fieldset>

			<fieldset className="grid gap-4 border-t pt-5">
				<legend className="sr-only">Freight</legend>
				<p className="text-muted-foreground text-sm">
					Freight — no LTL rate can be quoted without a class and an NMFC code. These come
					from the manufacturer.
				</p>
				<div className="grid gap-4 sm:grid-cols-2">
					<ProInput name="freightClass" label="Freight class" placeholder="70" />
					<ProInput name="nmfcCode" label="NMFC code" />
				</div>
			</fieldset>

			<div className="border-t pt-5">
				<ProCheckbox
					name="isActive"
					label="Series is active"
					description="Turn off to hide the whole series without deleting anything."
				/>
			</div>

			<ProSubmit className="justify-self-start">Save series</ProSubmit>
		</ProForm>
	)
}
