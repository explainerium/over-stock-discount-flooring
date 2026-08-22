import type { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/server/db/client"
import { hashToken, isExpired } from "@/server/auth/tokens"
import { AcceptInviteForm } from "./_components/AcceptInviteForm"

export const metadata: Metadata = {
	title: "Set Up Your Dealer Account",
	robots: { index: false, follow: false },
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
	const { token } = await params

	// Unlike the reset screen this one does look the invite up before rendering:
	// it needs the company name and email to show who the invitation is for, and
	// a dealer who clicks a stale link should be told so before typing a
	// password rather than after.
	const invite = await db.invite.findUnique({
		where: { tokenHash: hashToken(token) },
		include: { dealer: true },
	})

	const usable = invite && !invite.usedAt && !isExpired(invite.expiresAt)

	if (!usable) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-xl tracking-wide uppercase">
						Invitation Not Valid
					</CardTitle>
					<CardDescription>
						This invitation has expired or has already been used. Ask us to send a new
						one.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Link
						href="/login"
						className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
					>
						Back to sign in
					</Link>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-xl tracking-wide uppercase">Set Up Your Account</CardTitle>
				<CardDescription>
					{invite.dealer
						? `Creating an account for ${invite.dealer.companyName}.`
						: "Creating your account."}{" "}
					Signing in as <span className="text-foreground">{invite.email}</span>.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<AcceptInviteForm token={token} />
			</CardContent>
		</Card>
	)
}
