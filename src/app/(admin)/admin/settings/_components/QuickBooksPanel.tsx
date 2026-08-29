"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { FormError, ProForm, ProInput, ProSubmit } from "@/components/form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { qboItemsSchema, type QboItemsInput } from "@/lib/validation/quickbooks"
import type { QboStatus } from "@/server/integrations/quickbooks"
import { checkQboAction, disconnectQboAction, setQboItemsAction } from "../_actions"

/**
 * The QuickBooks connection.
 *
 * Three things, in the order they matter: whether it is connected, how long
 * that lasts, and what the invoice lines get billed against.
 *
 * The countdown is not decoration. A refresh token lasts a hundred days from
 * the last refresh, and once it lapses the only way back is for the owner to
 * press Connect again — so the number of days is on the screen he already
 * visits rather than in a log nobody reads.
 */
export function QuickBooksPanel({
	status,
	items,
	configured,
}: {
	status: QboStatus
	items: { goodsItemId: string; freightItemId: string }
	configured: boolean
}) {
	const [error, setError] = useState<string | null>(null)
	const [pending, startTransition] = useTransition()

	async function onSubmit(values: QboItemsInput) {
		setError(null)
		const result = await setQboItemsAction(values)
		if (result.ok) toast.success(result.message ?? "Saved.")
		else setError(result.message)
	}

	if (!configured) {
		return (
			<p className="text-muted-foreground text-sm">
				QuickBooks is not set up on this deployment yet — it needs{" "}
				<code className="font-mono text-xs">QBO_CLIENT_ID</code>,{" "}
				<code className="font-mono text-xs">QBO_CLIENT_SECRET</code> and{" "}
				<code className="font-mono text-xs">QBO_REDIRECT_URI</code> in the environment.
			</p>
		)
	}

	return (
		<div className="grid gap-5">
			<div className="flex flex-wrap items-center gap-2">
				{status.connected ? (
					<Badge>Connected</Badge>
				) : (
					<Badge variant="secondary">Not connected</Badge>
				)}
				{/* Which books. Worth saying out loud on a screen that can send an
				    invoice to a real company. */}
				<Badge variant="outline">{status.environment}</Badge>
			</div>

			{status.connected ? (
				<>
					<p className="text-muted-foreground text-sm">
						Connected {new Date(status.connectedAt!).toLocaleDateString("en-US")} to
						company {status.realmId}.{" "}
						{typeof status.daysUntilReconnect === "number" &&
							(status.daysUntilReconnect < 0
								? "The connection has lapsed — press Connect again."
								: `You will need to reconnect in ${status.daysUntilReconnect} days.`)}
					</p>

					<div className="flex flex-wrap gap-2">
						<Button
							variant="outline"
							disabled={pending}
							onClick={() =>
								startTransition(async () => {
									const result = await checkQboAction()
									if (result.ok) toast.success(result.message)
									else toast.error(result.message)
								})
							}
						>
							Test the connection
						</Button>
						<Button
							variant="outline"
							disabled={pending}
							onClick={() =>
								startTransition(async () => {
									const result = await disconnectQboAction()
									if (result.ok) toast.success(result.message)
									else toast.error(result.message)
								})
							}
						>
							Disconnect
						</Button>
					</div>
				</>
			) : (
				<div>
					<Button asChild>
						{/* A plain link, not a form: the last thing this does is send
						    the browser to Intuit. */}
						<a href="/api/qbo/connect">Connect to QuickBooks</a>
					</Button>
				</div>
			)}

			<ProForm<QboItemsInput>
				onSubmit={onSubmit}
				resolver={zodResolver(qboItemsSchema)}
				defaultValues={items}
				className="grid gap-4 border-t pt-5"
			>
				<FormError message={error} />

				<div className="grid gap-4 sm:grid-cols-2">
					<ProInput
						name="goodsItemId"
						label="Goods item"
						description="Every product line is billed against this."
						required
					/>
					<ProInput
						name="freightItemId"
						label="Freight item"
						description="Leave empty and orders with freight will not post."
					/>
				</div>

				<p className="text-muted-foreground text-xs">
					Open the item in QuickBooks and read the number off the end of the address bar.
				</p>

				<ProSubmit className="justify-self-start">Save items</ProSubmit>
			</ProForm>
		</div>
	)
}
