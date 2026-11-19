import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser } from "@/server/auth/guards"
import { LoginForm } from "./_components/LoginForm"

export const metadata: Metadata = {
	title: "Dealer / Contractor Log In",
	robots: { index: false, follow: false },
}

export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<{ redirectTo?: string }>
}) {
	const user = await getCurrentUser()
	if (user) redirect(user.role === "DEALER_USER" ? "/portal" : "/admin")

	const { redirectTo } = await searchParams

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-xl tracking-wide uppercase">
					Dealer / Contractor Log In
				</CardTitle>
				<CardDescription>Sign in to see your pricing and place an order.</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-4">
				<LoginForm redirectTo={redirectTo} />
				<Link
					href="/forgot-password"
					className="text-muted-foreground hover:text-foreground text-center text-sm underline underline-offset-4"
				>
					Forgot your password?
				</Link>
			</CardContent>
		</Card>
	)
}
