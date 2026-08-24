"use server"

import { revalidatePath } from "next/cache"
import { addressIdSchema, addressSchema, updateAddressSchema } from "@/lib/validation/addresses"
import type { ActionResult } from "@/lib/validation/dealers"
import { requireDealerScope } from "@/server/auth/guards"
import { audit } from "@/server/repositories/audit"
import {
	AddressError,
	archiveAddress,
	createAddress,
	setDefaultAddress,
	updateAddress,
} from "@/server/repositories/addresses"

/**
 * The dealer's own address book.
 *
 * Dealers manage these themselves rather than ringing the owner for every new
 * jobsite. A wrong address costs a conversation at approval, not money —
 * freight is quoted by the owner before anything ships — and a portal that
 * cannot take a new delivery address is a portal somebody stops using.
 *
 * Every action resolves the dealer from the session and scopes on it. The form
 * never carries a dealer id.
 */

function explain(error: unknown): string {
	if (error instanceof AddressError) return error.message
	console.error("[addresses]", error)
	return "Something went wrong. Try again."
}

function refresh() {
	revalidatePath("/portal/addresses")
	revalidatePath("/portal/cart")
}

export async function createAddressAction(input: unknown): Promise<ActionResult> {
	const { dealerId, user } = await requireDealerScope()

	const parsed = addressSchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}

	try {
		const created = await createAddress(dealerId, parsed.data)
		await audit({
			entity: "Address",
			entityId: created.id,
			action: "create",
			actorId: user.id,
			after: parsed.data,
		})
	} catch (error) {
		return { ok: false, message: explain(error) }
	}

	refresh()
	return { ok: true, message: "Address added." }
}

export async function updateAddressAction(input: unknown): Promise<ActionResult> {
	const { dealerId, user } = await requireDealerScope()

	const parsed = updateAddressSchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}

	const { addressId, ...fields } = parsed.data

	try {
		await updateAddress(dealerId, addressId, fields)
		await audit({
			entity: "Address",
			entityId: addressId,
			action: "update",
			actorId: user.id,
			after: fields,
		})
	} catch (error) {
		return { ok: false, message: explain(error) }
	}

	refresh()
	return { ok: true, message: "Address updated." }
}

export async function setDefaultAddressAction(input: unknown): Promise<ActionResult> {
	const { dealerId } = await requireDealerScope()

	const parsed = addressIdSchema.safeParse(input)
	if (!parsed.success) return { ok: false, message: "Unknown address." }

	try {
		await setDefaultAddress(dealerId, parsed.data.addressId)
	} catch (error) {
		return { ok: false, message: explain(error) }
	}

	refresh()
	return { ok: true, message: "Default updated." }
}

export async function archiveAddressAction(input: unknown): Promise<ActionResult> {
	const { dealerId, user } = await requireDealerScope()

	const parsed = addressIdSchema.safeParse(input)
	if (!parsed.success) return { ok: false, message: "Unknown address." }

	try {
		await archiveAddress(dealerId, parsed.data.addressId)
		await audit({
			entity: "Address",
			entityId: parsed.data.addressId,
			action: "archive",
			actorId: user.id,
		})
	} catch (error) {
		return { ok: false, message: explain(error) }
	}

	refresh()
	return { ok: true, message: "Address removed." }
}
