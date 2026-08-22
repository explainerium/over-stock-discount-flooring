"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { FormError, ProForm, ProInput, ProSubmit } from "@/components/form"
import { acceptInviteSchema, type AcceptInviteInput } from "@/lib/validation/auth"
import { acceptInvite } from "@/server/auth/actions"

export function AcceptInviteForm({ token }: { token: string }) {
	const [error, setError] = useState<string | null>(null)

	async function onSubmit(values: AcceptInviteInput) {
		setError(null)
		const result = await acceptInvite({ ...values, token })
		if (result && !result.ok) setError(result.message)
	}

	return (
		<ProForm<AcceptInviteInput>
			onSubmit={onSubmit}
			resolver={zodResolver(acceptInviteSchema)}
			defaultValues={{
				token,
				firstName: "",
				lastName: "",
				phone: "",
				password: "",
				confirmPassword: "",
			}}
			className="grid gap-4"
		>
			<FormError message={error} />
			<div className="grid gap-4 sm:grid-cols-2">
				<ProInput name="firstName" label="First name" required autoFocus />
				<ProInput name="lastName" label="Last name" required />
			</div>
			<ProInput name="phone" label="Phone" type="tel" autoComplete="tel" />
			<ProInput
				name="password"
				label="Password"
				type="password"
				description="At least 12 characters."
				autoComplete="new-password"
				required
			/>
			<ProInput
				name="confirmPassword"
				label="Confirm password"
				type="password"
				autoComplete="new-password"
				required
			/>
			<ProSubmit fullWidth>Create Account</ProSubmit>
		</ProForm>
	)
}
