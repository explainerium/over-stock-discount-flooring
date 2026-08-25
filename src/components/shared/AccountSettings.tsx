"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { toast } from "sonner"
import { FormError, ProForm, ProInput, ProSubmit } from "@/components/form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
	changeEmailSchema,
	changePasswordSchema,
	type ChangeEmailInput,
	type ChangePasswordInput,
} from "@/lib/validation/auth"
import { changeEmail, changePassword } from "@/server/auth/actions"

/**
 * Your own account.
 *
 * Shared between the admin and the dealer portal rather than written twice.
 * The owner is not the only person who will ever need to change a password —
 * every dealer user has one, and until this existed the only route was the
 * forgot-password flow, which needs a mailbox nobody has yet.
 *
 * Two separate forms rather than one. They are different decisions taken at
 * different moments, and a single Save that quietly did both would make a
 * password change out of somebody correcting a typo in their address.
 */
export function AccountSettings({ email }: { email: string }) {
	const [passwordError, setPasswordError] = useState<string | null>(null)
	const [emailError, setEmailError] = useState<string | null>(null)

	async function onChangePassword(values: ChangePasswordInput) {
		setPasswordError(null)
		const result = await changePassword(values)
		if (result.ok) toast.success(result.message)
		else setPasswordError(result.message)
	}

	async function onChangeEmail(values: ChangeEmailInput) {
		setEmailError(null)
		const result = await changeEmail(values)
		if (result.ok) toast.success(result.message)
		else setEmailError(result.message)
	}

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Password</CardTitle>
					<CardDescription>
						Changing this signs you out everywhere else. This browser stays signed in.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ProForm<ChangePasswordInput>
						onSubmit={onChangePassword}
						resolver={zodResolver(changePasswordSchema)}
						defaultValues={{ currentPassword: "", password: "", confirmPassword: "" }}
						className="grid max-w-sm gap-4"
					>
						<FormError message={passwordError} />

						<ProInput
							name="currentPassword"
							label="Current password"
							type="password"
							autoComplete="current-password"
							required
						/>
						<ProInput
							name="password"
							label="New password"
							type="password"
							autoComplete="new-password"
							description="At least 12 characters."
							required
						/>
						<ProInput
							name="confirmPassword"
							label="New password again"
							type="password"
							autoComplete="new-password"
							required
						/>

						<ProSubmit className="justify-self-start">Change password</ProSubmit>
					</ProForm>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Email</CardTitle>
					<CardDescription>
						The address you sign in with. You are {email} at the moment.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ProForm<ChangeEmailInput>
						onSubmit={onChangeEmail}
						resolver={zodResolver(changeEmailSchema)}
						defaultValues={{ currentPassword: "", email }}
						className="grid max-w-sm gap-4"
					>
						<FormError message={emailError} />

						<ProInput
							name="email"
							label="New email"
							type="email"
							autoComplete="email"
							// Said plainly because nothing verifies it: there is no
							// mailbox to send a confirmation from yet, so a typo here
							// is a typo you sign in with.
							description="You will sign in with this. Nothing is sent to confirm it, so check it."
							required
						/>
						<ProInput
							name="currentPassword"
							label="Your password"
							type="password"
							autoComplete="current-password"
							required
						/>

						<ProSubmit className="justify-self-start">Change email</ProSubmit>
					</ProForm>
				</CardContent>
			</Card>
		</>
	)
}
