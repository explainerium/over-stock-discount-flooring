import { label, type OrderStatus } from "@/server/domain/orders"

export interface TimelineEntry {
	id: string
	fromStatus: OrderStatus | null
	toStatus: OrderStatus
	note: string | null
	createdAt: Date
	actor: { firstName: string | null; lastName: string | null; email: string; role: string } | null
}

function actorName(actor: TimelineEntry["actor"]): string {
	if (!actor) return "Someone"
	const name = [actor.firstName, actor.lastName].filter(Boolean).join(" ")
	return name || actor.email
}

/**
 * Every move the order has made, and who made it.
 *
 * This is the answer to "why was my order rejected" and "who changed that
 * price" — the two questions the owner would otherwise field on the phone with
 * nothing in front of him.
 */
export function OrderTimeline({ entries }: { entries: TimelineEntry[] }) {
	if (entries.length === 0) return null

	return (
		<ol className="grid gap-4">
			{entries.map((entry) => (
				<li key={entry.id} className="border-l-2 pl-4">
					<p className="text-sm">
						<span className="font-medium">{label(entry.toStatus)}</span>
						{entry.fromStatus && (
							<span className="text-muted-foreground">
								{" "}
								from {label(entry.fromStatus).toLowerCase()}
							</span>
						)}
					</p>
					<p className="text-muted-foreground text-xs">
						{actorName(entry.actor)} · {entry.createdAt.toLocaleString("en-US")}
					</p>
					{entry.note && <p className="mt-2 text-sm whitespace-pre-wrap">{entry.note}</p>}
				</li>
			))}
		</ol>
	)
}
