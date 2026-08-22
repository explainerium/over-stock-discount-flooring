import type { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ForgotPasswordForm } from "./_components/ForgotPasswordForm"

export const metadata: Metadata = {
	title: "Reset Your Password",
	robots: { index: false, follow: false },
}

export default function ForgotPasswordPage() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-xl tracking-wide uppercase">Reset Password</CardTitle>
				<CardDescription>
					Enter your email and we will send you a link to set a new password.
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-4">
				<ForgotPasswordForm />
				<Link
					href="/login"
					className="text-muted-foreground hover:text-foreground text-center text-sm underline underline-offset-4"
				>
					Back to sign in
				</Link>
			</CardContent>
		</Card>
	)
}
