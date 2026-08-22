import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireStaff } from "@/server/auth/guards"

export default async function AdminHome() {
	const user = await requireStaff()

	return (
		<Card className="max-w-lg">
			<CardHeader>
				<CardTitle>Signed in</CardTitle>
				<CardDescription>
					Auth is working end to end. The dashboard, order approval and catalogue
					management land here next.
				</CardDescription>
			</CardHeader>
			<CardContent className="text-sm">
				<dl className="grid grid-cols-[8rem_1fr] gap-y-1">
					<dt className="text-muted-foreground">Email</dt>
					<dd>{user.email}</dd>
					<dt className="text-muted-foreground">Role</dt>
					<dd>{user.role}</dd>
				</dl>
			</CardContent>
		</Card>
	)
}
