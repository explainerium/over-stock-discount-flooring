"use client"

import { AlertCircleIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

/** Form-level failure — a wrong password, an expired link. Renders nothing when there is none. */
export function FormError({ message }: { message?: string | null }) {
	if (!message) return null

	return (
		<Alert variant="destructive" role="alert">
			<AlertCircleIcon />
			<AlertDescription>{message}</AlertDescription>
		</Alert>
	)
}
