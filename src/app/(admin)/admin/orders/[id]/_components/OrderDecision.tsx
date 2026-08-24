"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { transitionOrderAction } from "../../_actions"

export interface DecisionOption {
	to: string
	label: string
	/** Whether tapping it opens the reason panel instead of firing. */
	confirms: boolean
	/** Whether the reason is compulsory once the panel is open. */
	noteRequired: boolean
	/** Whether this move ends the order. Those are set apart and made quieter. */
	ends: boolean
	prompt: string
}

/**
 * The decision.
 *
 * Built for a phone held in one hand on a warehouse floor, which is where the
 * owner said he would be using it.
 *
 * The moves that end an order sit on their own row, below and quieter. Giving
 * Reject the same weight as Approve would make the irreversible action the
 * easiest one to hit by accident, and the dealer is the one who finds out.
 * They also always open a reason panel, whether or not the lifecycle compels a
 * reason — a tap that cannot be undone should cost two.
 */
export function OrderDecision({
	orderId,
	options,
}: {
	orderId: string
	options: DecisionOption[]
}) {
	const [open, setOpen] = useState<DecisionOption | null>(null)
	const [note, setNote] = useState("")
	const [pending, startTransition] = useTransition()

	function run(option: DecisionOption, reason?: string) {
		startTransition(async () => {
			const result = await transitionOrderAction({
				orderId,
				to: option.to,
				note: reason?.trim() || undefined,
			})

			if (result.ok) {
				toast.success(result.message)
				setOpen(null)
				setNote("")
			} else {
				toast.error(result.message)
			}
		})
	}

	function choose(option: DecisionOption) {
		if (option.confirms) {
			setNote("")
			setOpen(option)
		} else {
			run(option)
		}
	}

	if (options.length === 0) return null

	if (open) {
		return (
			<div className="grid gap-3">
				<label className="grid gap-2">
					<span className="text-sm font-medium">
						{open.prompt}
						{!open.noteRequired && (
							<span className="text-muted-foreground font-normal"> (optional)</span>
						)}
					</span>
					<Textarea
						value={note}
						onChange={(event) => setNote(event.target.value)}
						rows={3}
						autoFocus
						disabled={pending}
					/>
				</label>

				<div className="flex flex-col gap-2 sm:flex-row">
					<Button
						size="lg"
						variant={open.ends ? "destructive" : "default"}
						onClick={() => run(open, note)}
						disabled={pending || (open.noteRequired && !note.trim())}
					>
						{open.label}
					</Button>
					<Button
						size="lg"
						variant="ghost"
						onClick={() => setOpen(null)}
						disabled={pending}
					>
						Back
					</Button>
				</div>
			</div>
		)
	}

	const forward = options.filter((option) => !option.ends)
	const ending = options.filter((option) => option.ends)

	return (
		<div className="grid gap-4">
			{forward.length > 0 && (
				<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
					{forward.map((option, index) => (
						<Button
							key={option.to}
							size="lg"
							variant={index === 0 ? "default" : "outline"}
							onClick={() => choose(option)}
							disabled={pending}
						>
							{option.label}
						</Button>
					))}
				</div>
			)}

			{ending.length > 0 && (
				<div className="flex flex-wrap gap-4 border-t pt-3">
					{ending.map((option) => (
						<button
							key={option.to}
							type="button"
							onClick={() => choose(option)}
							disabled={pending}
							className="text-muted-foreground hover:text-destructive text-sm underline-offset-4 hover:underline disabled:opacity-50"
						>
							{option.label}
						</button>
					))}
				</div>
			)}
		</div>
	)
}
