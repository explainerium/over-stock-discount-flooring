"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { FormError, ProForm, ProInput, ProSubmit } from "@/components/form"
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validation/auth"
import { resetPassword } from "@/server/auth/actions"

export function ResetPasswordForm({ token }: { token: string }) {
	const [error, setError] = useState<string | null>(null)

	async function onSubmit(values: ResetPasswordInput) {
		setError(null)
		const result = await resetPassword({ ...values, token })
		if (result && !result.ok) setError(result.message)
	}

	return (
		<ProForm<ResetPasswordInput>
			onSubmit={onSubmit}
			resolver={zodResolver(resetPasswordSchema)}
			defaultValues={{ token, password: "", confirmPassword: "" }}
			className="grid gap-4"
		>
			<FormError message={error} />
			<ProInput
				name="password"
				label="New password"
				type="password"
				autoComplete="new-password"
				required
				autoFocus
			/>
			<ProInput
				name="confirmPassword"
				label="Confirm password"
				type="password"
				autoComplete="new-password"
				required
			/>
			<ProSubmit fullWidth>Set Password</ProSubmit>
		</ProForm>
	)
}
