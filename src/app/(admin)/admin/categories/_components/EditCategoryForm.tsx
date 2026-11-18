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
	updateCategoryFormSchema,
	type UpdateCategoryFormInput,
	type UpdateCategoryInput,
} from "@/lib/validation/catalog"
import { updateCategoryAction } from "../../products/_actions"

export function EditCategoryForm({ defaults }: { defaults: UpdateCategoryInput }) {
	const [error, setError] = useState<string | null>(null)

	// The id travels in the closure, never as a form field: see EditProductForm.
	const { id, ...formDefaults } = defaults

	async function onSubmit(values: UpdateCategoryFormInput) {
		setError(null)
		const result = await updateCategoryAction({ ...values, id })
		if (result.ok) toast.success(result.message ?? "Saved.")
		else setError(result.message)
	}

	return (
		<ProForm<UpdateCategoryFormInput>
			onSubmit={onSubmit}
			resolver={zodResolver(updateCategoryFormSchema)}
			defaultValues={formDefaults}
			className="grid gap-4"
		>
			<FormError message={error} />
			<ProInput name="name" label="Name" required />
			<ProTextarea
				name="blurb"
				label="Short description"
				rows={2}
				description="Optional. One line under the heading on the catalogue page."
			/>
			<ProInput
				name="sortOrder"
				label="Position"
				description="Lower comes first in the catalogue and the menu."
			/>
			<ProCheckbox
				name="isActive"
				label="Show on the site"
				description="Off hides the whole shelf from the public catalogue without touching its products."
			/>
			<ProSubmit className="justify-self-start">Save category</ProSubmit>
		</ProForm>
	)
}
