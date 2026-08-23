"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { toast } from "sonner"
import { FormError, ProForm, ProInput, ProSubmit } from "@/components/form"
import {
	dealerDiscountFormSchema,
	type DealerDiscountFormInput,
} from "@/lib/validation/pricing"
import { setDealerDiscountAction } from "../_actions"

export function FlatDiscountForm({
	dealerId,
	discountPct,
}: {
	dealerId: string
	discountPct: string
}) {
	const [error, setError] = useState<string | null>(null)

	/**
	 * The id is merged in here rather than carried in defaultValues.
	 *
	 * react-hook-form does not submit a default for a field that was never
	 * registered, so an id sitting only in defaultValues arrives as undefined —
	 * the schema then fails on a path with no input attached to it, and the form
	 * silently does nothing. An id is context, not something anybody types, so
	 * it belongs in the closure.
	 */
	async function onSubmit(values: DealerDiscountFormInput) {
		setError(null)
		const result = await setDealerDiscountAction({ ...values, dealerId })
		if (result.ok) toast.success(result.message)
		else setError(result.message)
	}

	return (
		<ProForm<DealerDiscountFormInput>
			onSubmit={onSubmit}
			resolver={zodResolver(dealerDiscountFormSchema)}
			defaultValues={{ discountPct }}
			className="grid gap-4 sm:grid-cols-[10rem_auto] sm:items-end"
		>
			<div className="sm:col-span-2">
				<FormError message={error} />
			</div>
			<ProInput
				name="discountPct"
				label="Flat discount"
				description="Percent off list, across everything. Leave empty for list pricing."
			/>
			<ProSubmit className="justify-self-start">Save</ProSubmit>
		</ProForm>
	)
}
