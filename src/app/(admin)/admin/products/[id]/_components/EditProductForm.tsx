"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useFormContext } from "react-hook-form"
import { toast } from "sonner"
import {
	FormError,
	ProCheckbox,
	ProCheckboxGroup,
	ProForm,
	ProInput,
	ProSelect,
	ProSubmit,
	ProTextarea,
} from "@/components/form"
import {
	NO_SERIES,
	updateProductFormSchema,
	type UpdateProductFormInput,
	type UpdateProductInput,
} from "@/lib/validation/catalog"
import { updateProductAction } from "../../_actions"
import { ProductImages } from "./ProductImages"

const PRICING_UOM = [
	{ value: "SQFT", label: "Per square foot (flooring)" },
	{ value: "LF", label: "Per linear foot" },
	{ value: "EACH", label: "Each" },
	{ value: "ROLL", label: "Per roll" },
]

/**
 * Every unit a dealer might pick. Which ones make sense depends on the product:
 * flooring is sq ft / box / pallet, trim is linear feet and sticks. The schema
 * only insists that at least one is chosen.
 */
const ORDER_UOMS = [
	{ value: "SQFT", label: "Sq ft" },
	{ value: "BOX", label: "Box" },
	{ value: "PALLET", label: "Pallet" },
	{ value: "LF", label: "Linear ft" },
	{ value: "STICK", label: "Piece" },
	{ value: "BUNDLE", label: "Bundle" },
	{ value: "EACH", label: "Each" },
	{ value: "ROLL", label: "Roll" },
]

const STOCK = [
	{ value: "IN_STOCK", label: "In stock" },
	{ value: "LOW", label: "Low" },
	{ value: "OUT", label: "Out of stock" },
	{ value: "SPECIAL_ORDER", label: "Special order" },
]

/**
 * Who may order this, when it is not everyone.
 *
 * Hidden until the flag is on, the same reasoning as the dealer terms form:
 * a list of dealers on a product offered to all of them is a control that
 * looks like it does something and does not.
 */
function DealerAccessFields({ dealers }: { dealers: { value: string; label: string }[] }) {
	const { watch } = useFormContext<UpdateProductFormInput>()
	if (!watch("dealerRestricted")) return null

	if (dealers.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				There are no dealer accounts yet, so this is offered to nobody until there are.
			</p>
		)
	}

	return (
		<ProCheckboxGroup
			name="dealerIds"
			label="Offered to"
			options={dealers}
			description="Everyone else sees the catalogue without it."
		/>
	)
}

/**
 * Only for something priced per foot.
 *
 * Trim is priced per linear foot but leaves the warehouse in pieces, so the
 * price on screen and the thing a dealer counts are different units. This is
 * the number that joins them.
 */
function PieceLengthField() {
	const { watch } = useFormContext<UpdateProductFormInput>()
	if (watch("pricingUom") !== "LF") return null

	return (
		<ProInput
			name="lfPerPiece"
			label="Length per piece (ft)"
			placeholder="12"
			description="Needed to order by the piece. Feet typed by a dealer round up to whole pieces."
		/>
	)
}

export function EditProductForm({
	defaults,
	categoryOptions,
	seriesOptions,
	dealers,
}: {
	defaults: UpdateProductInput
	categoryOptions: { value: string; label: string }[]
	seriesOptions: { value: string; label: string; hint?: string }[]
	dealers: { value: string; label: string }[]
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
	async function onSubmit(values: UpdateProductFormInput) {
		setError(null)
		const result = await updateProductAction({ ...values, id })
		if (result.ok) toast.success(result.message ?? "Saved.")
		else setError(result.message)
	}

	return (
		<ProForm<UpdateProductFormInput>
			onSubmit={onSubmit}
			resolver={zodResolver(updateProductFormSchema)}
			defaultValues={formDefaults}
			className="grid gap-5"
		>
			<FormError message={error} />

			<div className="grid gap-4 sm:grid-cols-2">
				<ProInput name="name" label="Name" required />
				<ProInput name="sku" label="SKU" required />
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<ProSelect name="categoryId" label="Category" options={categoryOptions} required />
				<ProSelect
					name="seriesId"
					label="Series (flooring only)"
					options={[
						{ value: NO_SERIES, label: "No series (not flooring)" },
						...seriesOptions,
					]}
				/>
			</div>

			<ProInput
				name="designName"
				label="Design name"
				description="Groups the same print film across formats, where one colour is stocked in more than one plank size."
			/>

			<ProTextarea
				name="description"
				label="Description"
				rows={4}
				description="Lines starting with • or - show as a bulleted list on the product page."
			/>

			<ProductImages />

			<div className="grid gap-4 border-t pt-4">
				<ProCheckbox
					name="dealerRestricted"
					label="Only certain dealers"
					description="Off means every signed-in dealer can order it."
				/>
				<DealerAccessFields dealers={dealers} />
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<ProSelect
					name="pricingUom"
					label="Sold by / priced per"
					options={PRICING_UOM}
					required
				/>
				<ProSelect name="stockStatus" label="Stock" options={STOCK} required />
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<ProInput
					name="listPrice"
					label="List price"
					description="In the unit above. Optional: a price set for a dealer works without one, but a % off needs it."
				/>
				<PieceLengthField />
			</div>

			<ProCheckboxGroup
				name="orderUoms"
				label="Dealers can order by"
				options={ORDER_UOMS}
				required
			/>

			<div className="grid gap-3 border-t pt-5">
				<ProCheckbox
					name="isPublic"
					label="Show on the public catalogue"
					description="Prices stay hidden publicly either way."
				/>
				<ProCheckbox
					name="isActive"
					label="Available to order"
					description="Turn off to retire a colour without deleting its order history."
				/>
			</div>

			<ProSubmit className="justify-self-start">Save product</ProSubmit>
		</ProForm>
	)
}
