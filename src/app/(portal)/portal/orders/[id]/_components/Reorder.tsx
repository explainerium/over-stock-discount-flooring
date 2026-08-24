"use client"

import { RotateCcwIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { reorderAction } from "../../../_actions"

/**
 * Ordering the same thing again.
 *
 * Sends the dealer to the cart on success rather than leaving them on a past
 * order looking at an unchanged page. The lines are in the new order, so that
 * is where they should be.
 */
export function Reorder({ orderId }: { orderId: string }) {
	const router = useRouter()
	const [pending, startTransition] = useTransition()

	function run() {
		startTransition(async () => {
			const result = await reorderAction({ orderId })

			if (result.ok) {
				toast.success(result.message)
				router.push("/portal/cart")
			} else {
				toast.error(result.message)
			}
		})
	}

	return (
		<Button variant="outline" onClick={run} disabled={pending}>
			<RotateCcwIcon aria-hidden />
			Order this again
		</Button>
	)
}
