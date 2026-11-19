"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { toast } from "sonner"
import { FormError, ProForm, ProSubmit, ProTextarea } from "@/components/form"
import { orderMailCcSchema, type OrderMailCcInput } from "@/lib/validation/dealers"
import { setLeadMailToAction } from "../_actions"

/**
 * Where the site's forms are sent: pricing inquiries, dealer / contractor
 * applications, messages and sample requests. Same address-list rules as order
 * mail, so the same schema.
 */
export function LeadMailForm({ addresses }: { addresses: string[] }) {
	const [error, setError] = useState<string | null>(null)

	async function onSubmit(values: OrderMailCcInput) {
		setError(null)
		const result = await setLeadMailToAction(values)
		if (result.ok) toast.success(result.message)
		else setError(result.message)
	}

	return (
		<ProForm<OrderMailCcInput>
			onSubmit={onSubmit}
			resolver={zodResolver(orderMailCcSchema)}
			defaultValues={{ addresses: addresses.join("\n") }}
			className="grid gap-4"
		>
			<FormError message={error} />

			<ProTextarea
				name="addresses"
				label="Send them to"
				rows={3}
				placeholder={"sales@example.com\nowner@example.com"}
				description="One per line. Leave empty and they go to you and any admin accounts, like orders."
			/>

			<ProSubmit className="justify-self-start">Save</ProSubmit>
		</ProForm>
	)
}
