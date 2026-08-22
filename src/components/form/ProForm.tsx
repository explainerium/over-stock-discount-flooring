"use client"

import type { ReactNode } from "react"
import {
	FormProvider,
	useForm,
	type DefaultValues,
	type FieldValues,
	type Resolver,
	type SubmitHandler,
} from "react-hook-form"

export interface ProFormProps<TValues extends FieldValues> {
	children: ReactNode
	onSubmit: SubmitHandler<TValues>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	resolver?: Resolver<TValues, any, any>
	defaultValues?: DefaultValues<TValues>
	className?: string
	id?: string
}

/**
 * Form shell.
 *
 * Holds the react-hook-form context so every Pro* field below finds it with
 * useFormContext and nothing has to be threaded through props.
 *
 * `onSubmit` is awaited, so `formState.isSubmitting` stays true for the whole
 * server round trip and ProSubmit can show a spinner without its own state.
 *
 * `noValidate` turns off the browser's native bubbles — they cannot be styled,
 * they ignore our messages, and they fire before the resolver runs.
 */
export function ProForm<TValues extends FieldValues>({
	children,
	onSubmit,
	resolver,
	defaultValues,
	className,
	id,
}: ProFormProps<TValues>) {
	const methods = useForm<TValues>({
		...(resolver ? { resolver } : {}),
		...(defaultValues ? { defaultValues } : {}),
	})

	return (
		<FormProvider {...methods}>
			<form
				id={id}
				className={className}
				onSubmit={methods.handleSubmit(onSubmit)}
				noValidate
			>
				{children}
			</form>
		</FormProvider>
	)
}
