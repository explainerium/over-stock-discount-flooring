"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import type { DealerStatus } from "@/generated/prisma/client"
import { reactivateDealerAction, suspendDealerAction } from "../../_actions"

/**
 * Suspend and reactivate.
 *
 * Suspension is behind a confirmation because it signs the dealer's whole team
 * out mid-order. Reactivation is not — it only restores what was there.
 */
export function DealerStatusActions({
	dealerId,
	status,
	activeUsers,
}: {
	dealerId: string
	status: DealerStatus
	activeUsers: number
}) {
	const [pending, startTransition] = useTransition()
	const [open, setOpen] = useState(false)

	function run(action: typeof suspendDealerAction) {
		startTransition(async () => {
			const result = await action({ id: dealerId })
			if (result.ok) toast.success(result.message)
			else toast.error(result.message)
			setOpen(false)
		})
	}

	if (status === "SUSPENDED") {
		return (
			<Button
				variant="outline"
				disabled={pending}
				onClick={() => run(reactivateDealerAction)}
			>
				Reactivate
			</Button>
		)
	}

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger asChild>
				<Button variant="outline">Suspend</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Suspend this dealer?</AlertDialogTitle>
					<AlertDialogDescription>
						They lose access to pricing immediately.
						{activeUsers > 0 && (
							<>
								{" "}
								{activeUsers} {activeUsers === 1 ? "person is" : "people are"} able
								to sign in right now and will be signed out.
							</>
						)}{" "}
						Existing orders are not affected, and you can reactivate them at any time.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						disabled={pending}
						onClick={(event) => {
							event.preventDefault()
							run(suspendDealerAction)
						}}
					>
						Suspend
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
