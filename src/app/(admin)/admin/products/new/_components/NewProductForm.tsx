"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useFormContext } from "react-hook-form"
import { FormError, ProForm, ProInput, ProSelect, ProSubmit } from "@/components/form"
import { createProductSchema, NO_SERIES, type CreateProductInput } from "@/lib/validation/catalog"
import { createProductAction } from "../../_actions"

type Option = { value: string; label: string; hint?: string }

const SOLD_BY_OPTIONS = [
	{ value: "EACH", label: "Each (a stair nose, a slab)" },
	{ value: "PIECE", label: "Piece, priced per linear foot (trim)" },
	{ value: "LF", label: "Linear foot, cut to length" },
	{ value: "ROLL", label: "Roll" },
]

/**
 * Only asked when there is no series.
 *
 * Flooring is sold by the box because its series says how many square feet a
 * box holds; asking anyway would invite an answer that contradicts the series.
 */
function SoldByField() {
	const { watch } = useFormContext<CreateProductInput>()
	if (watch("seriesId") !== NO_SERIES) return null

	return (
		<>
			<ProSelect
				name="soldBy"
				label="Sold by"
				options={SOLD_BY_OPTIONS}
				required
				description="How it is priced and ordered. Box fields stay blank for anything that is not flooring."
			/>
			{watch("soldBy") === "PIECE" && (
				<ProInput
					name="lfPerPiece"
					label="Length per piece (ft)"
					placeholder="12"
					required
					description="Dealers order whole pieces; the price is per foot, so a 12 ft piece costs 12 times the price."
				/>
			)}
		</>
	)
}

/**
 * A handful of fields.
 *
 * This form is the answer to the question the client actually asked — "if we
 * added a new product how hard would it be to put in the system". Flooring
 * takes its specs, packaging, weight and freight class from the series; other
 * products only need to say what they are sold by.
 */
export function NewProductForm({
	categoryOptions,
	seriesOptions,
}: {
	categoryOptions: Option[]
	seriesOptions: Option[]
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
			defaultValues={{
				name: "",
				sku: "",
				categoryId: "",
				seriesId: NO_SERIES,
				soldBy: "EACH",
				lfPerPiece: "",
			}}
			className="grid gap-4"
		>
			<FormError message={error} />
			<ProInput name="name" label="Name" required autoFocus />
			<ProInput name="sku" label="SKU" required description="How dealers will order it." />
			<ProSelect name="categoryId" label="Category" options={categoryOptions} required />
			<ProSelect
				name="seriesId"
				label="Series"
				options={[
					{ value: NO_SERIES, label: "No series (not flooring)" },
					...seriesOptions,
				]}
				description="Flooring only. Specs, packaging and freight all come from the series."
			/>
			<SoldByField />
			<p className="text-muted-foreground text-sm">
				Photos, description and price are added on the next screen.
			</p>
			<ProSubmit>Add product</ProSubmit>
		</ProForm>
	)
}
