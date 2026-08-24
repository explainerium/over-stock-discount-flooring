"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { CheckIcon } from "lucide-react"
import { useState } from "react"
import { FormError, ProForm, ProInput, ProSubmit, ProTextarea } from "@/components/form"
import { Button } from "@/components/ui/button"
import { sampleRequestFormSchema, type SampleRequestFormInput } from "@/lib/validation/leads"
import { requestSampleAction } from "../../../_actions"

/**
 * Asking for a sample.
 *
 * Closed until it is wanted. A product page's job is to sell the colour, and a
 * form sitting open underneath every one of sixty-two pages is noise on all of
 * them.
 *
 * Fulfilment is manual in Phase 1 — this creates a lead. The copy says so,
 * because "we will get one in the post" and "your sample has shipped" are
 * different promises and only one of them is true today.
 */
export function SampleRequest({
	productId,
	productName,
}: {
	productId: string
	productName: string
}) {
	const [open, setOpen] = useState(false)
	const [done, setDone] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function onSubmit(values: SampleRequestFormInput) {
		setError(null)
		const result = await requestSampleAction({ ...values, productId })
		if (result.ok) setDone(true)
		else setError(result.message)
	}

	if (done) {
		return (
			<p className="flex items-start gap-2 text-sm">
				<CheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
				<span>
					Thanks — we have your {productName} sample request and will be in touch to
					confirm.
				</span>
			</p>
		)
	}

	if (!open) {
		return (
			<Button variant="outline" onClick={() => setOpen(true)}>
				Request a sample
			</Button>
		)
	}

	return (
		<ProForm<SampleRequestFormInput>
			onSubmit={onSubmit}
			resolver={zodResolver(sampleRequestFormSchema)}
			defaultValues={{
				name: "",
				email: "",
				phone: "",
				address: "",
				message: "",
				website: "",
			}}
			className="grid max-w-md gap-4"
		>
			<div>
				<p className="font-medium">Request a {productName} sample</p>
				<p className="text-muted-foreground mt-1 text-sm">
					We post these out by hand, so give us a day or two.
				</p>
			</div>

			<FormError message={error} />

			<ProInput name="name" label="Your name" required autoComplete="name" />
			<ProInput name="email" label="Email" type="email" required autoComplete="email" />
			<ProInput name="phone" label="Phone" autoComplete="tel" />
			<ProTextarea
				name="address"
				label="Where should we send it?"
				rows={3}
				required
				placeholder={"Name\nStreet\nCity, State ZIP"}
			/>
			<ProTextarea name="message" label="Anything else?" rows={2} />

			{/* Hidden from people, irresistible to the bots that fill every input. */}
			<ProInput name="website" label="Leave this empty" tabIndex={-1} className="hidden" />

			<div className="flex flex-wrap gap-2">
				<ProSubmit>Send the request</ProSubmit>
				<Button type="button" variant="ghost" onClick={() => setOpen(false)}>
					Cancel
				</Button>
			</div>
		</ProForm>
	)
}
