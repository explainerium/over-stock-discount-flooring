import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireDealerScope } from "@/server/auth/guards"

export default async function PortalHome() {
	const { user, dealerId } = await requireDealerScope()

	return (
		<Card className="max-w-lg">
			<CardHeader>
				<CardTitle>Signed in</CardTitle>
				<CardDescription>
					Your catalogue, pricing and order history land here next.
				</CardDescription>
			</CardHeader>
			<CardContent className="text-sm">
				<dl className="grid grid-cols-[8rem_1fr] gap-y-1">
					<dt className="text-muted-foreground">Signed in as</dt>
					<dd>{user.email}</dd>
					<dt className="text-muted-foreground">Company</dt>
					<dd>{user.dealerName}</dd>
					{/* Proof the scope guard hands pages a non-null dealer id. */}
					<dt className="text-muted-foreground">Scope</dt>
					<dd className="font-mono text-xs">{dealerId}</dd>
				</dl>
			</CardContent>
		</Card>
	)
}
