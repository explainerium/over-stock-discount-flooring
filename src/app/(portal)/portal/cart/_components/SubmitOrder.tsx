"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { submitOrderAction } from "../../_actions"

/**
 * Submitting.
 *
 * The button says "Submit for approval" and never "Place order" or "Checkout".
 * Nothing is bought here — this goes to the owner, who confirms freight and
 * decides. Getting that wording wrong sets an expectation the system will not
 * meet, and the dealer finds out at the worst moment.
 */
export function SubmitOrder({
	disabled,
	orderId,
}: {
	disabled?: boolean
	/** Omitted for the cart. Supplied when sending back an order after changes. */
	orderId?: string
}) {
	const [notes, setNotes] = useState("")
	const [pending, startTransition] = useTransition()

	function submit() {
		startTransition(async () => {
			// On success this redirects, so anything returned is a refusal.
			const result = await submitOrderAction({
				notes: notes.trim() || undefined,
				orderId,
			})
			if (result && !result.ok) toast.error(result.message)
		})
	}

	return (
		<div className="grid gap-4">
			<label className="grid gap-2">
				<span className="text-sm font-medium">
					{orderId ? "Anything to tell us about the change?" : "Anything we should know?"}
				</span>
				<Textarea
					value={notes}
					onChange={(event) => setNotes(event.target.value)}
					rows={3}
					placeholder="Delivery notes, a date you need it by, a jobsite name…"
					disabled={pending}
				/>
			</label>

			<div className="flex flex-wrap gap-3">
				<Button size="lg" onClick={submit} disabled={disabled || pending}>
					{orderId ? "Send it back" : "Submit for approval"}
				</Button>
			</div>
		</div>
	)
}
