"use client"

import { Loader2Icon } from "lucide-react"
import type { ReactNode } from "react"
import { useFormContext } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ProSubmitProps {
	children: ReactNode
	className?: string
	disabled?: boolean
	fullWidth?: boolean
}

/**
 * Submit button that knows the form is in flight.
 *
 * It reads isSubmitting from context rather than taking a prop, so no screen
 * has to hold its own "loading" boolean and forget to reset it on failure.
 */
export function ProSubmit({ children, className, disabled, fullWidth }: ProSubmitProps) {
	const {
		formState: { isSubmitting },
	} = useFormContext()

	return (
		<Button
			type="submit"
			disabled={disabled || isSubmitting}
			className={cn(fullWidth && "w-full", className)}
		>
			{isSubmitting && <Loader2Icon className="animate-spin" aria-hidden />}
			{children}
		</Button>
	)
}
