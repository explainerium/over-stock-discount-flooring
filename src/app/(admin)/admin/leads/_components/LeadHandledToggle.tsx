"use client"

import { CheckIcon, UndoIcon } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { setLeadHandledAction } from "../_actions"

export function LeadHandledToggle({ id, handled }: { id: string; handled: boolean }) {
	const [pending, startTransition] = useTransition()

	return (
		<Button
			variant={handled ? "ghost" : "outline"}
			size="sm"
			disabled={pending}
			onClick={() =>
				startTransition(async () => {
					const result = await setLeadHandledAction({ id, handled: !handled })
					if (result.ok) toast.success(result.message)
					else toast.error(result.message)
				})
			}
		>
			{handled ? <UndoIcon aria-hidden /> : <CheckIcon aria-hidden />}
			{handled ? "Reopen" : "Dealt with"}
		</Button>
	)
}
