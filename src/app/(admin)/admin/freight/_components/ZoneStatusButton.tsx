"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { setZoneActiveAction } from "../_actions"

/**
 * Retire a zone, or bring it back.
 *
 * No confirmation on either. Retiring a zone changes what future orders are
 * quoted and touches nothing that has already been priced, and the button
 * immediately offers to undo itself — which is a cheaper safeguard than a
 * dialog the owner learns to click through.
 */
export function ZoneStatusButton({ id, isActive }: { id: string; isActive: boolean }) {
	const [pending, startTransition] = useTransition()

	return (
		<Button
			variant="outline"
			disabled={pending}
			onClick={() =>
				startTransition(async () => {
					const result = await setZoneActiveAction({ id, isActive: !isActive })
					if (result.ok) toast.success(result.message)
					else toast.error(result.message)
				})
			}
		>
			{isActive ? "Retire" : "Bring back"}
		</Button>
	)
}
