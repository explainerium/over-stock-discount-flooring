"use client"

import { Controller, useFormContext } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { FieldShell } from "./FieldShell"

export interface ProInputProps {
	name: string
	label?: string
	type?: React.HTMLInputTypeAttribute
	placeholder?: string
	description?: string
	required?: boolean
	disabled?: boolean
	autoComplete?: string
	autoFocus?: boolean
	/** -1 takes a field out of the tab order — used for the honeypot. */
	tabIndex?: number
	className?: string
}

/**
 * A labelled text input bound to the surrounding form.
 *
 *   <ProInput name="email" label="Email" type="email" required />
 *
 * That line replaces a wrapper, a label, an input, an error paragraph and the
 * aria wiring between them — which is the whole point of the kit.
 */
export function ProInput({
	name,
	label,
	type = "text",
	placeholder,
	description,
	required,
	disabled,
	autoComplete,
	autoFocus,
	tabIndex,
	className,
}: ProInputProps) {
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
					<Input
						{...field}
						id={name}
						type={type}
						value={field.value ?? ""}
						placeholder={placeholder}
						disabled={disabled || field.disabled}
						autoComplete={autoComplete}
						autoFocus={autoFocus}
						tabIndex={tabIndex}
						aria-invalid={fieldState.error ? true : undefined}
					/>
				</FieldShell>
			)}
		/>
	)
}
