"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { FormError, ProForm, ProInput, ProSubmit } from "@/components/form"
import { inviteUserSchema, type InviteUserInput } from "@/lib/validation/dealers"
import { inviteUserAction } from "../../_actions"
import { InviteLinkPanel } from "../../_components/InviteLinkPanel"

export function InviteUserForm({ dealerId }: { dealerId: string }) {
	const [error, setError] = useState<string | null>(null)
	const [issued, setIssued] = useState<{ email: string; link: string } | null>(null)

	async function onSubmit(values: InviteUserInput) {
		setError(null)
		const result = await inviteUserAction(values)
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
		<ProForm<InviteUserInput>
			onSubmit={onSubmit}
			resolver={zodResolver(inviteUserSchema)}
			defaultValues={{ dealerId, email: "" }}
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
