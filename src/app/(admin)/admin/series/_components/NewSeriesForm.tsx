"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { FormError, ProForm, ProInput, ProSubmit } from "@/components/form"
import { createSeriesSchema, type CreateSeriesInput } from "@/lib/validation/catalog"
import { createSeriesAction } from "../../products/_actions"

/** A name only, then straight to the series' own page for the specs. */
export function NewSeriesForm() {
	const router = useRouter()
	const [error, setError] = useState<string | null>(null)

	async function onSubmit(values: CreateSeriesInput) {
		setError(null)
		const result = await createSeriesAction(values)
		if (!result.ok) {
			setError(result.message)
			return
		}
		toast.success("Series added. Now fill in its specs.")
		router.push(`/admin/series/${result.data!.id}`)
	}

	return (
		<ProForm<CreateSeriesInput>
			onSubmit={onSubmit}
			resolver={zodResolver(createSeriesSchema)}
			defaultValues={{ name: "" }}
			className="grid gap-4"
		>
			<FormError message={error} />
			<ProInput name="name" label="Name" required placeholder="AR - Commercial" />
			<ProSubmit className="justify-self-start">Add series</ProSubmit>
		</ProForm>
	)
}
