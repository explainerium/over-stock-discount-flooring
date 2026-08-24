"use client"

import { Controller, useFormContext } from "react-hook-form"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export interface ProCheckboxProps {
	name: string
	label: string
	description?: string
	disabled?: boolean
	className?: string
}

/**
 * A single boolean. Renders inline rather than through FieldShell, because a
 * checkbox reads as "label to the right of the box" and stacking it under a
 * heading the way a text field does makes it look like a separate section.
 */
export function ProCheckbox({ name, label, description, disabled, className }: ProCheckboxProps) {
	const { control } = useFormContext()

	return (
		<Controller
			control={control}
			name={name}
			render={({ field, fieldState }) => (
				<div className={cn("grid gap-1.5", className)}>
					<div className="flex items-center gap-2.5">
						<Checkbox
							id={name}
							checked={Boolean(field.value)}
							onCheckedChange={field.onChange}
							disabled={disabled}
							aria-invalid={fieldState.error ? true : undefined}
						/>
						{/* Clicking the words toggles the box, so they have to look
						    like a target. The shared Label cannot know this — it is
						    used for text fields too, where a pointer would be wrong. */}
						<Label
							htmlFor={name}
							className={cn("font-normal", !disabled && "cursor-pointer")}
						>
							{label}
						</Label>
					</div>
					{description && (
						<p className="text-muted-foreground pl-[1.6rem] text-sm">{description}</p>
					)}
					{fieldState.error && (
						<p role="alert" className="text-destructive pl-[1.6rem] text-sm">
							{fieldState.error.message}
						</p>
					)}
				</div>
			)}
		/>
	)
}
