"use client"

import { XIcon } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { revokeInviteAction } from "../../_actions"

export function RevokeInviteButton({ inviteId }: { inviteId: string }) {
	const [pending, startTransition] = useTransition()

	return (
		<Button
			variant="ghost"
			size="sm"
			disabled={pending}
			aria-label="Withdraw invitation"
			onClick={() =>
				startTransition(async () => {
					const result = await revokeInviteAction({ id: inviteId })
					if (result.ok) toast.success(result.message)
					else toast.error(result.message)
				})
			}
		>
			<XIcon aria-hidden />
			Withdraw
		</Button>
	)
}
