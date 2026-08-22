"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { FormError, ProForm, ProInput, ProSubmit, ProTextarea } from "@/components/form"
import { Button } from "@/components/ui/button"
import { createDealerSchema, type CreateDealerInput } from "@/lib/validation/dealers"
import { createDealerAction } from "../../_actions"
import { InviteLinkPanel } from "../../_components/InviteLinkPanel"

export function NewDealerForm() {
	const router = useRouter()
	const [error, setError] = useState<string | null>(null)
	const [created, setCreated] = useState<{
		dealerId: string
		email?: string
		link?: string
	} | null>(null)

	async function onSubmit(values: CreateDealerInput) {
		setError(null)
		const result = await createDealerAction(values)

		if (!result.ok) {
			setError(result.message)
			return
		}
		// Deliberately not redirecting straight to the dealer's page: if an
		// invitation was issued, the link is on this response and nowhere else.
		// Navigating away now would throw it away.
		setCreated({
			dealerId: result.data!.dealerId,
			email: values.inviteEmail,
			link: result.data!.inviteLink,
		})
	}

	if (created) {
		return (
			<div className="grid gap-4">
				{created.link && created.email && (
					<InviteLinkPanel email={created.email} link={created.link} />
				)}
				<div className="flex gap-2">
					<Button onClick={() => router.push(`/admin/dealers/${created.dealerId}`)}>
						Open dealer
					</Button>
					<Button variant="outline" asChild>
						<Link href="/admin/dealers">Back to dealers</Link>
					</Button>
				</div>
			</div>
		)
	}

	return (
		<ProForm<CreateDealerInput>
			onSubmit={onSubmit}
			resolver={zodResolver(createDealerSchema)}
			defaultValues={{
				companyName: "",
				contactName: "",
				contactEmail: "",
				contactPhone: "",
				notes: "",
				inviteEmail: "",
			}}
			className="grid gap-4"
		>
			<FormError message={error} />

			<ProInput name="companyName" label="Company name" required autoFocus />
			<div className="grid gap-4 sm:grid-cols-2">
				<ProInput name="contactName" label="Contact name" />
				<ProInput name="contactPhone" label="Phone" type="tel" />
			</div>
			<ProInput name="contactEmail" label="Contact email" type="email" />
			<ProTextarea name="notes" label="Notes" rows={3} description="Internal only." />

			<div className="border-t pt-4">
				<ProInput
					name="inviteEmail"
					label="Invite their first user"
					type="email"
					description="Optional. Creates a sign-in link you can send them straight away."
				/>
			</div>

			<ProSubmit>Create dealer</ProSubmit>
		</ProForm>
	)
}
