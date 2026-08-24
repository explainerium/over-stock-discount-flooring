"use server"

import { revalidatePath } from "next/cache"
import { orderMailCcSchema, parseAddressList, type ActionResult } from "@/lib/validation/dealers"
import { requireStaff } from "@/server/auth/guards"
import { audit } from "@/server/repositories/audit"
import { getOrderMailCc, setOrderMailCc } from "@/server/repositories/settings"

/**
 * Who gets copied on order mail.
 *
 * Audited like any other change with money attached to it: adding an address
 * here means somebody outside the business starts receiving dealer pricing.
 */
export async function setOrderMailCcAction(input: unknown): Promise<ActionResult> {
	const staff = await requireStaff()

	const parsed = orderMailCcSchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}

	const before = await getOrderMailCc()
	const after = parseAddressList(parsed.data.addresses)

	await setOrderMailCc(after)

	await audit({
		entity: "Setting",
		entityId: "order_mail_cc",
		action: "update",
		actorId: staff.id,
		before: { addresses: before },
		after: { addresses: after },
	})

	revalidatePath("/admin/settings")
	return {
		ok: true,
		message:
			after.length === 0 ? "Nobody is copied now." : `${after.length} copied on order mail.`,
	}
}
