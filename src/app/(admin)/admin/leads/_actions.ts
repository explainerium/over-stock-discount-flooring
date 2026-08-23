"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import type { ActionResult } from "@/lib/validation/dealers"
import { requireStaff } from "@/server/auth/guards"
import { setLeadHandled } from "@/server/repositories/leads"

const schema = z.object({ id: z.string().min(1), handled: z.boolean() })

export async function setLeadHandledAction(input: unknown): Promise<ActionResult> {
	await requireStaff()

	const parsed = schema.safeParse(input)
	if (!parsed.success) return { ok: false, message: "Unknown lead." }

	await setLeadHandled(parsed.data.id, parsed.data.handled)
	revalidatePath("/admin/leads")
	return { ok: true, message: parsed.data.handled ? "Marked as dealt with." : "Reopened." }
}
