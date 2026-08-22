import { Badge } from "@/components/ui/badge"
import type { StockStatus } from "@/generated/prisma/client"

const LOOK: Record<StockStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
	IN_STOCK: { label: "In stock", variant: "secondary" },
	LOW: { label: "Low", variant: "outline" },
	OUT: { label: "Out", variant: "destructive" },
	SPECIAL_ORDER: { label: "Special order", variant: "outline" },
}

export function StockBadge({ status }: { status: StockStatus }) {
	const look = LOOK[status]
	return <Badge variant={look.variant}>{look.label}</Badge>
}
