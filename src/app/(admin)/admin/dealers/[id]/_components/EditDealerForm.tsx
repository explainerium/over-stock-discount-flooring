"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { toast } from "sonner"
import { FormError, ProForm, ProInput, ProSubmit, ProTextarea } from "@/components/form"
import { createDealerSchema, type CreateDealerInput } from "@/lib/validation/dealers"
import { updateDealerAction } from "../../_actions"

/**
 * A dealer's contact details.
 *
 * The id is held in the closure rather than in `defaultValues`: react-hook-form
 * does not submit a default for a field it never registered, so an id living
 * only there arrives undefined and validation fails on a path with no visible
 * input — a form that silently does nothing.
 *
 * Reuses the create schema minus the invitation, because the fields are the
 * same fields. The invite belongs to the moment an account is opened, not to
 * correcting a phone number.
 */
const editSchema = createDealerSchema.omit({ inviteEmail: true })
type EditInput = Omit<CreateDealerInput, "inviteEmail">

export interface EditableDealer {
	id: string
	companyName: string
	contactName: string
	contactEmail: string
	contactPhone: string
	notes: string
}

export function EditDealerForm({ dealer }: { dealer: EditableDealer }) {
	const [error, setError] = useState<string | null>(null)

	async function onSubmit(values: EditInput) {
		setError(null)
		const result = await updateDealerAction({ ...values, id: dealer.id })
		if (result.ok) toast.success(result.message)
		else setError(result.message)
	}

	return (
		<ProForm<EditInput>
			onSubmit={onSubmit}
			resolver={zodResolver(editSchema)}
			defaultValues={{
				companyName: dealer.companyName,
				contactName: dealer.contactName,
				contactEmail: dealer.contactEmail,
				contactPhone: dealer.contactPhone,
				notes: dealer.notes,
			}}
			className="grid gap-4"
		>
			<FormError message={error} />

			<ProInput name="companyName" label="Company" required />

			<div className="grid gap-4 sm:grid-cols-2">
				<ProInput name="contactName" label="Contact" autoComplete="off" />
				<ProInput name="contactPhone" label="Phone" autoComplete="off" />
			</div>

			<ProInput
				name="contactEmail"
				label="Contact email"
				type="email"
				description="Copied on their order mail. Not a login — people are invited separately."
				autoComplete="off"
			/>

			<ProTextarea name="notes" label="Notes" rows={3} description="Only staff see these." />

			<ProSubmit className="justify-self-start">Save details</ProSubmit>
		</ProForm>
	)
}
