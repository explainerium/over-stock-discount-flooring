"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { FormError, ProForm, ProInput, ProSubmit, ProTextarea } from "@/components/form"
import { createCategorySchema, type CreateCategoryInput } from "@/lib/validation/catalog"
import { createCategoryAction } from "../../products/_actions"

export function NewCategoryForm() {
	const router = useRouter()
	const [error, setError] = useState<string | null>(null)

	async function onSubmit(values: CreateCategoryInput) {
		setError(null)
		const result = await createCategoryAction(values)
		if (!result.ok) {
			setError(result.message)
			return
		}
		toast.success("Category added.")
		router.push(`/admin/categories/${result.data!.id}`)
	}

	return (
		<ProForm<CreateCategoryInput>
			onSubmit={onSubmit}
			resolver={zodResolver(createCategorySchema)}
			defaultValues={{ name: "", blurb: "", sortOrder: "" }}
			className="grid gap-4"
		>
			<FormError message={error} />
			<ProInput name="name" label="Name" required placeholder="Trim & Moldings" />
			<ProTextarea
				name="blurb"
				label="Short description"
				rows={2}
				description="Optional. One line under the heading on the catalog page."
			/>
			<ProInput name="sortOrder" label="Position" placeholder="0" />
			<ProSubmit className="justify-self-start">Add category</ProSubmit>
		</ProForm>
	)
}
