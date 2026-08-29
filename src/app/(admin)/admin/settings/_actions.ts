"use server"

import { revalidatePath } from "next/cache"
import { orderMailCcSchema, parseAddressList, type ActionResult } from "@/lib/validation/dealers"
import { requireStaff } from "@/server/auth/guards"
import { audit } from "@/server/repositories/audit"
import { getOrderMailCc, setOrderMailCc } from "@/server/repositories/settings"
import { qboItemsSchema } from "@/lib/validation/quickbooks"
import {
	checkConnection,
	clearConnection,
	getItemRefs,
	setItemRefs,
} from "@/server/repositories/quickbooks"

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

/**
 * Disconnects QuickBooks.
 *
 * Cleared here first and revoked at Intuit second — see clearConnection. An
 * owner who wants the connection gone must not be blocked by a third party
 * being slow.
 */
export async function disconnectQboAction(): Promise<ActionResult> {
	const staff = await requireStaff()

	await clearConnection()

	await audit({
		entity: "Setting",
		entityId: "qbo_connection",
		action: "qbo:disconnect",
		actorId: staff.id,
	})

	revalidatePath("/admin/settings")
	return { ok: true, message: "Disconnected from QuickBooks." }
}

/**
 * The two item ids every invoice line has to point at.
 *
 * QuickBooks will not accept a line without one, and the ids belong to the
 * client's own chart of accounts — there is nothing sensible to default them
 * to. Until they are set, an approved order says so instead of posting
 * something his bookkeeper has to unpick.
 */
export async function setQboItemsAction(input: unknown): Promise<ActionResult> {
	const staff = await requireStaff()

	const parsed = qboItemsSchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}

	const before = await getItemRefs()
	const after = {
		goodsItemId: parsed.data.goodsItemId.trim(),
		freightItemId: parsed.data.freightItemId?.trim() || null,
	}

	await setItemRefs(after)

	await audit({
		entity: "Setting",
		entityId: "qbo_items",
		action: "update",
		actorId: staff.id,
		// Written out field by field: Prisma wants a JSON object and an interface
		// without an index signature is not one.
		before: before
			? { goodsItemId: before.goodsItemId, freightItemId: before.freightItemId ?? null }
			: {},
		after: { goodsItemId: after.goodsItemId, freightItemId: after.freightItemId },
	})

	revalidatePath("/admin/settings")
	return { ok: true, message: "Saved." }
}

/** Proves the connection still works, rather than that a token has not expired. */
export async function checkQboAction(): Promise<ActionResult> {
	await requireStaff()

	const result = await checkConnection()
	return result.ok ? { ok: true, message: result.detail } : { ok: false, message: result.detail }
}
