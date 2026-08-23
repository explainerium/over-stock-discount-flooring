"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { FormError, ProForm, ProInput, ProSubmit, ProTextarea } from "@/components/form"
import { contactSchema, type ContactInput } from "@/lib/validation/leads"
import { submitContactAction } from "../../_actions"
import { Honeypot, Sent } from "../../_components/PublicFormShell"

export function ContactForm() {
	const [error, setError] = useState<string | null>(null)
	const [sent, setSent] = useState<string | null>(null)

	async function onSubmit(values: ContactInput) {
		setError(null)
		const result = await submitContactAction(values)
		if (result.ok) setSent(result.message ?? "Thanks.")
		else setError(result.message)
	}

	if (sent) return <Sent message={sent} />

	return (
		<ProForm<ContactInput>
			onSubmit={onSubmit}
			resolver={zodResolver(contactSchema)}
			defaultValues={{ name: "", email: "", phone: "", message: "", website: "" }}
			className="relative grid gap-4"
		>
			<FormError message={error} />

			<Honeypot>
				<ProInput name="website" label="Website" tabIndex={-1} autoComplete="off" />
			</Honeypot>

			<ProInput name="name" label="Name" required autoFocus />
			<div className="grid gap-4 sm:grid-cols-2">
				<ProInput name="email" label="Email" type="email" required autoComplete="email" />
				<ProInput name="phone" label="Phone" type="tel" autoComplete="tel" />
			</div>
			<ProTextarea
				name="message"
				label="What can we help with?"
				rows={4}
				description="Optional."
			/>
			<ProSubmit className="justify-self-start">Send</ProSubmit>
		</ProForm>
	)
}
