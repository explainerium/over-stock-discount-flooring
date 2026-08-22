"use client"

import { Controller, useFormContext } from "react-hook-form"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { FieldShell } from "./FieldShell"

export interface ProSelectOption {
	value: string
	label: string
	hint?: string
}

export interface ProSelectProps {
	name: string
	label?: string
	options: ProSelectOption[]
	placeholder?: string
	description?: string
	required?: boolean
	disabled?: boolean
	className?: string
}

export function ProSelect({
	name,
	label,
	options,
	placeholder = "Choose…",
	description,
	required,
	disabled,
	className,
}: ProSelectProps) {
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
					<Select
						value={field.value ?? ""}
						onValueChange={field.onChange}
						disabled={disabled}
					>
						<SelectTrigger
							id={name}
							className="w-full"
							aria-invalid={fieldState.error ? true : undefined}
						>
							<SelectValue placeholder={placeholder} />
						</SelectTrigger>
						<SelectContent>
							{options.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
									{option.hint && (
										<span className="text-muted-foreground ml-2 text-xs">
											{option.hint}
										</span>
									)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</FieldShell>
			)}
		/>
	)
}
