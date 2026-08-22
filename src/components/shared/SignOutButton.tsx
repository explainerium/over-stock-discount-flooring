"use client"

import { LogOutIcon } from "lucide-react"
import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { logout } from "@/server/auth/actions"

/** Signs out this browser. Sessions on other devices are untouched. */
export function SignOutButton() {
	const [pending, startTransition] = useTransition()

	return (
		<Button
			variant="outline"
			size="sm"
			disabled={pending}
			onClick={() => startTransition(() => void logout())}
		>
			<LogOutIcon aria-hidden />
			Sign out
		</Button>
	)
}
