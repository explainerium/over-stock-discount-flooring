"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { FormError, ProForm, ProInput, ProSelect, ProSubmit } from "@/components/form"
import { createProductSchema, type CreateProductInput } from "@/lib/validation/catalog"
import { createProductAction } from "../../_actions"

/**
 * Four fields.
 *
 * This form is the answer to the question the client actually asked — "if we
 * added a new product how hard would it be to put in the system". Because
 * specs, packaging, weight and freight class all live on the series, adding a
 * colour never touches any of them.
 */
export function NewProductForm({
	seriesOptions,
}: {
	seriesOptions: { value: string; label: string; hint?: string }[]
}) {
	const router = useRouter()
	const [error, setError] = useState<string | null>(null)

	async function onSubmit(values: CreateProductInput) {
		setError(null)
		const result = await createProductAction(values)
		if (!result.ok) {
			setError(result.message)
			return
		}
		// Straight to the edit screen: it is created hidden, and publishing it is
		// a decision rather than a side effect of typing a name.
		router.push(`/admin/products/${result.data!.id}`)
	}

	return (
		<ProForm<CreateProductInput>
			onSubmit={onSubmit}
			resolver={zodResolver(createProductSchema)}
			defaultValues={{ name: "", sku: "", seriesId: "", imageUrl: "" }}
			className="grid gap-4"
		>
			<FormError message={error} />
			<ProInput name="name" label="Colour name" required autoFocus />
			<ProInput
				name="sku"
				label="SKU"
				required
				description="How dealers will order it."
			/>
			<ProSelect
				name="seriesId"
				label="Series"
				options={seriesOptions}
				required
				description="Specs, packaging and freight all come from the series."
			/>
			<ProInput
				name="imageUrl"
				label="Swatch image"
				placeholder="/swatches/gold-a-brookfield.jpg"
				description="Optional for now — can be added later."
			/>
			<ProSubmit>Add product</ProSubmit>
		</ProForm>
	)
}
