"use client"

import { Controller, useFormContext } from "react-hook-form"
import { Textarea } from "@/components/ui/textarea"
import { FieldShell } from "./FieldShell"

export interface ProTextareaProps {
	name: string
	label?: string
	placeholder?: string
	description?: string
	required?: boolean
	disabled?: boolean
	rows?: number
	className?: string
}

export function ProTextarea({
	name,
	label,
	placeholder,
	description,
	required,
	disabled,
	rows = 4,
	className,
}: ProTextareaProps) {
	const { control } = useFormContext()

	return (
		<Controller
			control={control}
			name={name}
			render={({ field, fieldState }) => (
				<FieldShell
					name={name}
					label={label}
					description={description}
					error={fieldState.error?.message}
					required={required}
					className={className}
				>
					<Textarea
						{...field}
						id={name}
						rows={rows}
						value={field.value ?? ""}
						placeholder={placeholder}
						disabled={disabled || field.disabled}
						aria-invalid={fieldState.error ? true : undefined}
					/>
				</FieldShell>
			)}
		/>
	)
}
