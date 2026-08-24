"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { toast } from "sonner"
import { FormError, ProForm, ProSubmit, ProTextarea } from "@/components/form"
import { orderMailCcSchema, type OrderMailCcInput } from "@/lib/validation/dealers"
import { setOrderMailCcAction } from "../_actions"

/**
 * Who else sees order mail.
 *
 * A bookkeeper, a warehouse address, whoever the owner wants. They have no
 * account here and do not need one — being copied on an email is not a reason
 * to hand somebody a login to dealer pricing.
 */
export function OrderMailCcForm({ addresses }: { addresses: string[] }) {
	const [error, setError] = useState<string | null>(null)

	async function onSubmit(values: OrderMailCcInput) {
		setError(null)
		const result = await setOrderMailCcAction(values)
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
				label="Copy these addresses"
				rows={4}
				placeholder={"bookkeeper@example.com\nwarehouse@example.com"}
				description="One per line. They see every order notification, including prices. Leave empty to copy nobody."
			/>

			<ProSubmit className="justify-self-start">Save</ProSubmit>
		</ProForm>
	)
}
