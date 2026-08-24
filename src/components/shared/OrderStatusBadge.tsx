import { Badge } from "@/components/ui/badge"
import { label, type OrderStatus } from "@/server/domain/orders"

/**
 * Status, as a person would say it.
 *
 * "Awaiting approval" rather than "Submitted" — the dealer wants to know what
 * is happening to their order, not which enum value it holds.
 */
const TONE: Record<OrderStatus, "default" | "secondary" | "outline" | "destructive"> = {
	DRAFT: "outline",
	SUBMITTED: "default",
	CHANGES_REQUESTED: "outline",
	APPROVED: "secondary",
	INVOICED: "secondary",
	SHIPPED: "secondary",
	DELIVERED: "secondary",
	CLOSED: "outline",
	REJECTED: "destructive",
	CANCELLED: "outline",
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
	return <Badge variant={TONE[status]}>{label(status)}</Badge>
}
