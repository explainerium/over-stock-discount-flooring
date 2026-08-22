"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { toast } from "sonner"
import { FormError, ProCheckbox, ProForm, ProInput, ProSubmit, ProTextarea } from "@/components/form"
import { updateSeriesSchema, type UpdateSeriesInput } from "@/lib/validation/catalog"
import { updateSeriesAction } from "../../../products/_actions"

/**
 * Editing a series edits every colour under it.
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

	async function onSubmit(values: UpdateSeriesInput) {
		setError(null)
		const result = await updateSeriesAction(values)
		if (result.ok) toast.success(result.message ?? "Saved.")
		else setError(result.message)
	}

	return (
		<ProForm<UpdateSeriesInput>
			onSubmit={onSubmit}
			resolver={zodResolver(updateSeriesSchema)}
			defaultValues={defaults}
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
					Plank — shared by all {productCount} colours in this series.
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
					Freight — no LTL rate can be quoted without a class and an NMFC code. These
					come from the manufacturer.
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
