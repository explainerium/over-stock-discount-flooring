"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { FormError, ProForm, ProInput, ProSubmit } from "@/components/form"
import { loginSchema, type LoginInput } from "@/lib/validation/auth"
import { login } from "@/server/auth/actions"

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
	const [error, setError] = useState<string | null>(null)

	async function onSubmit(values: LoginInput) {
		setError(null)
		// A successful login redirects, so this only ever returns on failure.
		const result = await login({ ...values, redirectTo })
		if (result && !result.ok) setError(result.message)
	}

	return (
		<ProForm<LoginInput>
			onSubmit={onSubmit}
			resolver={zodResolver(loginSchema)}
			defaultValues={{ email: "", password: "" }}
			className="grid gap-4"
		>
			<FormError message={error} />
			<ProInput
				name="email"
				label="Email"
				type="email"
				autoComplete="username"
				required
				autoFocus
			/>
			<ProInput
				name="password"
				label="Password"
				type="password"
				autoComplete="current-password"
				required
			/>
			<ProSubmit fullWidth>Sign In</ProSubmit>
		</ProForm>
	)
}
