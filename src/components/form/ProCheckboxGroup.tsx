"use client"

import { Controller, useFormContext } from "react-hook-form"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { FieldShell } from "./FieldShell"

export interface ProCheckboxGroupProps {
	name: string
	label?: string
	options: { value: string; label: string }[]
	description?: string
	required?: boolean
	className?: string
}

/**
 * A set of booleans stored as an array — the units a dealer may order a product
 * in. Kept as one field rather than several so the "pick at least one" rule can
 * live in the schema instead of being reimplemented in the component.
 */
export function ProCheckboxGroup({
	name,
	label,
	options,
	description,
	required,
	className,
}: ProCheckboxGroupProps) {
	const { control } = useFormContext()

	return (
		<Controller
			control={control}
			name={name}
			render={({ field, fieldState }) => {
				const selected: string[] = Array.isArray(field.value) ? field.value : []

				return (
					<FieldShell
						name={name}
						label={label}
						description={description}
						error={fieldState.error?.message}
						required={required}
						className={className}
					>
						<div className="flex flex-wrap gap-x-5 gap-y-2.5">
							{options.map((option) => (
								<div key={option.value} className="flex items-center gap-2">
									<Checkbox
										id={`${name}-${option.value}`}
										checked={selected.includes(option.value)}
										onCheckedChange={(checked) =>
											field.onChange(
												checked
													? [...selected, option.value]
													: selected.filter((v) => v !== option.value),
											)
										}
									/>
									<Label
										htmlFor={`${name}-${option.value}`}
										className="cursor-pointer font-normal"
									>
										{option.label}
									</Label>
								</div>
							))}
						</div>
					</FieldShell>
				)
			}}
		/>
	)
}
