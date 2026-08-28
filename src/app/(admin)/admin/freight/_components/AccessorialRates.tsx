"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { toast } from "sonner"
import { FormError, ProCheckbox, ProForm, ProInput, ProSubmit } from "@/components/form"
import { accessorialSchema, type AccessorialInput } from "@/lib/validation/freight"
import { setAccessorialAction } from "../_actions"

export interface AccessorialRow {
	code: string
	label: string
	rate: string
	isActive: boolean
	/** What the charge is for, in the owner's terms rather than the carrier's. */
	hint: string
}

/**
 * The three extras, and what each one costs.
 *
 * They are edited a row at a time rather than as one long form, because they
 * are changed a row at a time — a carrier puts liftgate up and nothing else
 * moves. One save button for all three would make every change look like three.
 *
 * The set is fixed: these are the three flags an address carries, and adding a
 * fourth means adding it to the address as well. So there is no "add" here,
 * only a rate and whether it is charged at all.
 */
function Row({ charge }: { charge: AccessorialRow }) {
	const [error, setError] = useState<string | null>(null)

	async function onSubmit(values: AccessorialInput) {
		setError(null)
		const result = await setAccessorialAction({ ...values, code: charge.code })
		if (result.ok) toast.success(result.message)
		else setError(result.message)
	}

	return (
		<ProForm<AccessorialInput>
			onSubmit={onSubmit}
			resolver={zodResolver(accessorialSchema)}
			defaultValues={{ code: charge.code, rate: charge.rate, isActive: charge.isActive }}
			className="grid gap-3 border-t py-4 first:border-t-0 sm:grid-cols-[1fr_10rem_auto] sm:items-end"
		>
			<div>
				<p className="font-medium">{charge.label}</p>
				<p className="text-muted-foreground text-xs">{charge.hint}</p>
				<ProCheckbox name="isActive" label="Charge it" className="mt-2" />
			</div>

			<ProInput name="rate" label="Rate" />

			<ProSubmit className="justify-self-start">Save</ProSubmit>

			<FormError message={error} />
		</ProForm>
	)
}

export function AccessorialRates({ charges }: { charges: AccessorialRow[] }) {
	return (
		<div className="grid">
			{charges.map((charge) => (
				<Row key={charge.code} charge={charge} />
			))}
		</div>
	)
}
