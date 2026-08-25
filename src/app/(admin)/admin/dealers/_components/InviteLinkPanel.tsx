"use client"

import { CheckIcon, CopyIcon, MailIcon } from "lucide-react"
import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

/**
 * The one-time invitation link.
 *
 * This is shown once and cannot be shown again. Only the token's hash is
 * stored, so after this component unmounts the URL genuinely does not exist
 * anywhere — the alternative would be keeping a working invite link in the
 * database, which is a spare key to an account.
 *
 * Until the client has a mailbox on his own domain and the DNS records to
 * authenticate it, this is also how invitations reach dealers: he copies the
 * link and sends it himself.
 */
export function InviteLinkPanel({ email, link }: { email: string; link: string }) {
	const [copied, setCopied] = useState(false)

	async function copy() {
		try {
			await navigator.clipboard.writeText(link)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch {
			// Clipboard access can be refused — over plain http, or by permission.
			// The link is on screen and selectable either way, so this is not worth
			// an error message.
		}
	}

	return (
		<Alert>
			<MailIcon />
			<AlertTitle>Invitation ready for {email}</AlertTitle>
			<AlertDescription className="grid gap-3">
				<p>
					Send them this link. It works once, expires in seven days, and{" "}
					<strong className="text-foreground">cannot be shown again</strong> — you can
					always issue a new one.
				</p>
				<code className="bg-muted block overflow-x-auto rounded p-2 text-xs break-all">
					{link}
				</code>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={copy}
					className="justify-self-start"
				>
					{copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
					{copied ? "Copied" : "Copy link"}
				</Button>
			</AlertDescription>
		</Alert>
	)
}
