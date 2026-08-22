"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2Icon } from "lucide-react"
import { useState } from "react"
import { FormError, ProForm, ProInput, ProSubmit } from "@/components/form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validation/auth"
import { requestPasswordReset } from "@/server/auth/actions"

export function ForgotPasswordForm() {
	const [error, setError] = useState<string | null>(null)
	const [sent, setSent] = useState<string | null>(null)

	async function onSubmit(values: ForgotPasswordInput) {
		setError(null)
		const result = await requestPasswordReset(values)
		if (result.ok) setSent(result.message ?? "Check your email.")
		else setError(result.message)
	}

	// The confirmation is deliberately vague about whether the address matched
	// anyone — a definite "we sent it" would let anyone test which dealers have
	// accounts.
	if (sent) {
		return (
			<Alert>
				<CheckCircle2Icon />
				<AlertDescription>{sent}</AlertDescription>
			</Alert>
		)
	}

	return (
		<ProForm<ForgotPasswordInput>
			onSubmit={onSubmit}
			resolver={zodResolver(forgotPasswordSchema)}
			defaultValues={{ email: "" }}
			className="grid gap-4"
		>
			<FormError message={error} />
			<ProInput name="email" label="Email" type="email" autoComplete="username" required autoFocus />
			<ProSubmit fullWidth>Send Reset Link</ProSubmit>
		</ProForm>
	)
}
