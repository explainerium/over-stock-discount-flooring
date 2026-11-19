"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { CheckIcon } from "lucide-react"
import { useState } from "react"
import { FormError, ProForm, ProInput, ProSelect, ProSubmit, ProTextarea } from "@/components/form"
import { Button } from "@/components/ui/button"
import { priceInquiryFormSchema, type PriceInquiryFormInput } from "@/lib/validation/leads"
import { submitPriceInquiryAction } from "../../../_actions"

const CUSTOMER_OPTIONS = [
	{ value: "HOMEOWNER", label: "Homeowner" },
	{ value: "CONTRACTOR", label: "Contractor" },
	{ value: "DEALER", label: "Dealer" },
]

/**
 * "Inquire About Pricing" — the client's button, on every product page.
 *
 * Prices stay off the public site, so this is how anyone who is not signed in
 * asks for one. Closed until it is wanted, like the sample request. The
 * product is fixed by the page and shown rather than asked for, so every
 * inquiry is about exactly one product.
 */
export function PriceInquiry({
	productId,
	productName,
	sku,
	isFlooring,
}: {
	productId: string
	productName: string
	sku: string
	/** Flooring asks for square feet; a stair nose or a countertop asks how many. */
	isFlooring: boolean
}) {
	const [open, setOpen] = useState(false)
	const [done, setDone] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function onSubmit(values: PriceInquiryFormInput) {
		setError(null)
		const result = await submitPriceInquiryAction({ ...values, productId })
		if (result.ok) setDone(true)
		else setError(result.message)
	}

	if (done) {
		return (
			<p className="flex items-start gap-2 text-sm">
				<CheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
				<span>
					Thanks — we have your inquiry about {productName} and will be in touch with
					pricing.
				</span>
			</p>
		)
	}

	if (!open) {
		return (
			<Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
				Inquire About Pricing
			</Button>
		)
	}

	return (
		<ProForm<PriceInquiryFormInput>
			onSubmit={onSubmit}
			resolver={zodResolver(priceInquiryFormSchema)}
			defaultValues={{
				name: "",
				phone: "",
				email: "",
				sqFt: "",
				quantity: "",
				zip: "",
				message: "",
				website: "",
			}}
			className="grid gap-4"
		>
			<div>
				<p className="font-medium">Inquire About Pricing</p>
				<p className="text-muted-foreground mt-1 text-sm">
					{productName} · <span className="font-mono">{sku}</span>
				</p>
			</div>

			<FormError message={error} />

			<ProSelect name="customerType" label="I am a" options={CUSTOMER_OPTIONS} required />
			<ProInput name="name" label="Your name" required autoComplete="name" />
			<div className="grid gap-4 sm:grid-cols-2">
				<ProInput name="phone" label="Phone" type="tel" required autoComplete="tel" />
				<ProInput name="email" label="Email" type="email" required autoComplete="email" />
			</div>
			<div className="grid gap-4 sm:grid-cols-2">
				{isFlooring ? (
					<ProInput
						name="sqFt"
						label="Approximate square footage"
						inputMode="decimal"
						placeholder="1200"
					/>
				) : (
					<ProInput name="quantity" label="How many do you need?" placeholder="10" />
				)}
				<ProInput
					name="zip"
					label="ZIP code"
					required
					inputMode="numeric"
					autoComplete="postal-code"
				/>
			</div>
			<ProTextarea name="message" label="Anything else?" rows={2} />

			{/* Hidden from people, irresistible to the bots that fill every input. */}
			<ProInput name="website" label="Leave this empty" tabIndex={-1} className="hidden" />

			<div className="flex flex-wrap gap-2">
				<ProSubmit>Send the inquiry</ProSubmit>
				<Button type="button" variant="ghost" onClick={() => setOpen(false)}>
					Cancel
				</Button>
			</div>
		</ProForm>
	)
}
