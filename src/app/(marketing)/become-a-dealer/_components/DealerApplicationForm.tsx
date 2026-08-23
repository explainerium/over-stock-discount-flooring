"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { FormError, ProForm, ProInput, ProSubmit, ProTextarea } from "@/components/form"
import { dealerApplicationSchema, type DealerApplicationInput } from "@/lib/validation/leads"
import { submitDealerApplicationAction } from "../../_actions"
import { Honeypot, Sent } from "../../_components/PublicFormShell"

export function DealerApplicationForm() {
	const [error, setError] = useState<string | null>(null)
	const [sent, setSent] = useState<string | null>(null)

	async function onSubmit(values: DealerApplicationInput) {
		setError(null)
		const result = await submitDealerApplicationAction(values)
		if (result.ok) setSent(result.message ?? "Thanks.")
		else setError(result.message)
	}

	if (sent) return <Sent message={sent} />

	return (
		<ProForm<DealerApplicationInput>
			onSubmit={onSubmit}
			resolver={zodResolver(dealerApplicationSchema)}
			defaultValues={{ name: "", email: "", phone: "", company: "", message: "", website: "" }}
			className="relative grid gap-4"
		>
			<FormError message={error} />

			<Honeypot>
				<ProInput name="website" label="Website" tabIndex={-1} autoComplete="off" />
			</Honeypot>

			<ProInput name="company" label="Company name" required autoFocus />
			<ProInput name="name" label="Your name" required />
			<div className="grid gap-4 sm:grid-cols-2">
				<ProInput name="email" label="Email" type="email" required autoComplete="email" />
				<ProInput name="phone" label="Phone" type="tel" autoComplete="tel" />
			</div>
			<ProTextarea
				name="message"
				label="Anything we should know?"
				rows={3}
				description="Optional — what you install, roughly how much you buy, where you are."
			/>
			<ProSubmit className="justify-self-start">Apply for an account</ProSubmit>
		</ProForm>
	)
}
