"use client"

import { CheckCircle2Icon } from "lucide-react"
import type { ReactNode } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"

/**
 * What a public form shows once it has been sent.
 *
 * Kept as its own component because the contact form and the dealer
 * application both need it and both would otherwise grow their own.
 */
export function Sent({ message }: { message: string }) {
	return (
		<Alert>
			<CheckCircle2Icon />
			<AlertDescription>{message}</AlertDescription>
		</Alert>
	)
}

/**
 * The honeypot field.
 *
 * Off-screen rather than `display: none` — some bots skip hidden inputs, but
 * almost none skip one that is merely positioned away. `tabIndex={-1}` and
 * `aria-hidden` keep it out of the keyboard order and out of a screen reader,
 * so a person never meets it.
 */
export function Honeypot({ children }: { children: ReactNode }) {
	return (
		<div
			aria-hidden
			className="pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden"
		>
			{children}
		</div>
	)
}
