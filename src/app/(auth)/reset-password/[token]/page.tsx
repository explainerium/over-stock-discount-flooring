import type { Metadata } from "next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResetPasswordForm } from "./_components/ResetPasswordForm"

export const metadata: Metadata = {
	title: "Choose a New Password",
	robots: { index: false, follow: false },
}

export default async function ResetPasswordPage({
	params,
}: {
	params: Promise<{ token: string }>
}) {
	// The token is not checked here. Validating it on render would mean telling
	// a crawler which links are live; the action checks it at the moment it
	// matters, which is also the only moment it can be used.
	const { token } = await params

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-xl tracking-wide uppercase">New Password</CardTitle>
				<CardDescription>Choose a password of at least 12 characters.</CardDescription>
			</CardHeader>
			<CardContent>
				<ResetPasswordForm token={token} />
			</CardContent>
		</Card>
	)
}
