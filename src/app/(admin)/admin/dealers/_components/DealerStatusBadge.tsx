import { Badge } from "@/components/ui/badge"
import type { DealerStatus } from "@/generated/prisma/client"

/**
 * PENDING is not a warning state — it is the normal condition of a dealer whose
 * invitation has not been accepted yet, which is most of them on any given day.
 */
const LOOK: Record<
	DealerStatus,
	{ label: string; variant: "default" | "secondary" | "destructive" }
> = {
	ACTIVE: { label: "Active", variant: "default" },
	PENDING: { label: "Invitation pending", variant: "secondary" },
	SUSPENDED: { label: "Suspended", variant: "destructive" },
}

export function DealerStatusBadge({ status }: { status: DealerStatus }) {
	const look = LOOK[status]
	return <Badge variant={look.variant}>{look.label}</Badge>
}
