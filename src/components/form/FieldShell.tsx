"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

export interface FieldShellProps {
	name: string
	label?: string
	description?: string
	error?: string
	required?: boolean
	className?: string
	children: ReactNode
}

/**
 * Label, description and error around one control.
 *
 * Every Pro* field renders through this so spacing, the required marker and
 * error placement are decided once. Without it each field re-invents the same
 * four divs and they drift apart within a dozen screens.
 */
export function FieldShell({
	name,
	label,
	description,
	error,
	required,
	className,
	children,
}: FieldShellProps) {
	const describedBy = [description && `${name}-description`, error && `${name}-error`]
		.filter(Boolean)
		.join(" ")

	return (
		<div className={cn("grid gap-2", className)} data-invalid={error ? "" : undefined}>
			{label && (
				<Label htmlFor={name}>
					{label}
					{required && (
						<span className="text-destructive" aria-hidden>
							*
						</span>
					)}
				</Label>
			)}

			{/* aria-describedby is threaded down rather than set on the wrapper —
			    a screen reader announces the error only if it is tied to the input. */}
			<div aria-describedby={describedBy || undefined}>{children}</div>

			{description && (
				<p id={`${name}-description`} className="text-muted-foreground text-sm">
					{description}
				</p>
			)}
			{error && (
				<p id={`${name}-error`} role="alert" className="text-destructive text-sm">
					{error}
				</p>
			)}
		</div>
	)
}
