"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useFormContext } from "react-hook-form"
import { toast } from "sonner"
import { FormError, ProCheckbox, ProForm, ProInput, ProSelect, ProSubmit } from "@/components/form"
import { dealerTermsFormSchema, type DealerTermsFormInput } from "@/lib/validation/dealers"
import { setDealerTermsAction } from "../../_actions"

const TERMS = [
	{ value: "PREPAY", label: "Prepay" },
	{ value: "COD", label: "COD" },
	{ value: "NET_15", label: "Net 15" },
	{ value: "NET_30", label: "Net 30" },
	{ value: "NET_60", label: "Net 60" },
]

const FREIGHT = [
	{ value: "ZONE", label: "Zone table" },
	{ value: "FLAT", label: "Flat rate per order" },
	{ value: "LIVE", label: "Live carrier quote" },
	{ value: "MANUAL", label: "Quoted by hand" },
]

/**
 * Fields that only matter given another answer.
 *
 * Rendering them always would mean an owner filling in a flat rate on a dealer
 * who is not on flat freight, and a certificate date on one who pays tax. The
 * schema refuses those combinations; hiding them is what stops him meeting the
 * refusal in the first place.
 */
function ConditionalFields() {
	const { watch } = useFormContext<DealerTermsFormInput>()
	const freightMode = watch("freightMode")
	const taxExempt = watch("taxExempt")

	return (
		<>
			{freightMode === "FLAT" && (
				<ProInput
					name="flatFreightRate"
					label="Flat freight rate"
					description="Charged on every order, whatever the shipment weighs."
					required
				/>
			)}

			{taxExempt && (
				<ProInput
					name="resaleCertExpiresAt"
					label="Resale certificate expires"
					type="date"
					description="An expired certificate is the same as no certificate."
					required
				/>
			)}
		</>
	)
}

export interface DealerTerms {
	dealerId: string
	paymentTerms: string
	freightMode: string
	flatFreightRate: string
	minOrderValue: string
	taxExempt: boolean
	resaleCertExpiresAt: string
}

/**
 * How this dealer buys.
 *
 * All of these were columns with no interface, so the system had been treating
 * every dealer as net 30, zone freight, taxable and with no minimum — the
 * defaults, not decisions. The owner can now say what is actually true.
 */
export function DealerTermsForm({ terms }: { terms: DealerTerms }) {
	const [error, setError] = useState<string | null>(null)

	async function onSubmit(values: DealerTermsFormInput) {
		setError(null)
		const result = await setDealerTermsAction({ ...values, dealerId: terms.dealerId })
		if (result.ok) toast.success(result.message)
		else setError(result.message)
	}

	return (
		<ProForm<DealerTermsFormInput>
			onSubmit={onSubmit}
			resolver={zodResolver(dealerTermsFormSchema)}
			defaultValues={{
				paymentTerms: terms.paymentTerms as DealerTermsFormInput["paymentTerms"],
				freightMode: terms.freightMode as DealerTermsFormInput["freightMode"],
				flatFreightRate: terms.flatFreightRate,
				minOrderValue: terms.minOrderValue,
				taxExempt: terms.taxExempt,
				resaleCertExpiresAt: terms.resaleCertExpiresAt,
			}}
			className="grid gap-4"
		>
			<FormError message={error} />

			<div className="grid gap-4 sm:grid-cols-2">
				<ProSelect name="paymentTerms" label="Payment terms" options={TERMS} required />
				<ProSelect name="freightMode" label="Freight" options={FREIGHT} required />
			</div>

			<ConditionalFields />

			<ProInput
				name="minOrderValue"
				label="Minimum order"
				description="Leave empty for no minimum. Checked when they submit."
			/>

			<ProCheckbox
				name="taxExempt"
				label="Resale exempt"
				description="No sales tax on their invoices."
			/>

			<ProSubmit className="justify-self-start">Save terms</ProSubmit>
		</ProForm>
	)
}
