"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { FormError, ProForm, ProInput, ProSubmit } from "@/components/form"
import { inviteUserFormSchema, type InviteUserFormInput } from "@/lib/validation/dealers"
import { inviteUserAction } from "../../_actions"
import { InviteLinkPanel } from "../../_components/InviteLinkPanel"

export function InviteUserForm({ dealerId }: { dealerId: string }) {
	const [error, setError] = useState<string | null>(null)
	const [issued, setIssued] = useState<{ email: string; link: string } | null>(null)

	/**
	 * The id is merged in here rather than carried in defaultValues.
	 *
	 * react-hook-form does not submit a default for a field that was never
	 * registered, so an id sitting only in defaultValues arrives as undefined —
	 * the schema then fails on a path with no input attached to it, and the form
	 * silently does nothing. An id is context, not something anybody types, so
	 * it belongs in the closure.
	 */
	async function onSubmit(values: InviteUserFormInput) {
		setError(null)
		const result = await inviteUserAction({ ...values, dealerId })
		if (result.ok) setIssued({ email: result.data!.email, link: result.data!.inviteLink })
		else setError(result.message)
	}

	if (issued) {
		return (
			<div className="grid gap-3">
				<InviteLinkPanel email={issued.email} link={issued.link} />
				<button
					type="button"
					onClick={() => setIssued(null)}
					className="text-muted-foreground hover:text-foreground w-fit text-sm underline underline-offset-4"
				>
					Invite someone else
				</button>
			</div>
		)
	}

	return (
		<ProForm<InviteUserFormInput>
			onSubmit={onSubmit}
			resolver={zodResolver(inviteUserFormSchema)}
			defaultValues={{ email: "" }}
			className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start"
		>
			<div className="grid gap-3 sm:col-span-2">
				<FormError message={error} />
			</div>
			<ProInput name="email" label="Email address" type="email" required />
			<div className="sm:pt-[1.65rem]">
				<ProSubmit>Send invitation</ProSubmit>
			</div>
		</ProForm>
	)
}
