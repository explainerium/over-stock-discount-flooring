import "server-only"
import { db } from "@/server/db/client"
import type { AddressInput } from "@/lib/validation/addresses"

/**
 * Ship-to addresses.
 *
 * Every function takes `dealerId` and scopes on it, same rule as everywhere
 * else. An address id on its own is not proof of anything, and the cost of
 * getting this wrong is one dealer editing another's delivery address.
 */

export class AddressError extends Error {
	constructor(
		message: string,
		readonly code: "NOT_FOUND" | "IN_USE",
	) {
		super(message)
		this.name = "AddressError"
	}
}

const addressSelect = {
	id: true,
	label: true,
	line1: true,
	line2: true,
	city: true,
	state: true,
	zip: true,
	isResidential: true,
	needsLiftgate: true,
	limitedAccess: true,
	isDefault: true,
	isActive: true,
} as const

/** Everything a dealer can still ship to, default first. */
export function listAddresses(dealerId: string) {
	return db.address.findMany({
		where: { dealerId, isActive: true },
		select: addressSelect,
		orderBy: [{ isDefault: "desc" }, { label: "asc" }, { line1: "asc" }],
	})
}

/** Including archived ones — the admin view, where history matters. */
export function listAllAddresses(dealerId: string) {
	return db.address.findMany({
		where: { dealerId },
		select: addressSelect,
		orderBy: [{ isActive: "desc" }, { isDefault: "desc" }, { line1: "asc" }],
	})
}

/**
 * Adds one.
 *
 * The first address a dealer saves becomes their default, because a dealer with
 * exactly one address should never have to pick it. After that a new address is
 * only the default if they say so.
 */
export async function createAddress(dealerId: string, input: AddressInput, makeDefault?: boolean) {
	const existing = await db.address.count({ where: { dealerId, isActive: true } })
	const isDefault = makeDefault ?? existing === 0

	return db.$transaction(async (tx) => {
		if (isDefault) {
			await tx.address.updateMany({ where: { dealerId }, data: { isDefault: false } })
		}
		return tx.address.create({
			data: { dealerId, ...input, isDefault },
			select: addressSelect,
		})
	})
}

export async function updateAddress(dealerId: string, addressId: string, input: AddressInput) {
	const existing = await db.address.findFirst({
		where: { id: addressId, dealerId },
		select: { id: true },
	})
	if (!existing) throw new AddressError("That address is not yours.", "NOT_FOUND")

	return db.address.update({
		where: { id: existing.id },
		data: input,
		select: addressSelect,
	})
}

/**
 * Exactly one default, or none.
 *
 * Two defaults is not a display bug — it decides which destination an order
 * gets pre-filled with, so the clearing and the setting go in one transaction.
 */
export async function setDefaultAddress(dealerId: string, addressId: string) {
	const target = await db.address.findFirst({
		where: { id: addressId, dealerId, isActive: true },
		select: { id: true },
	})
	if (!target) throw new AddressError("That address is not yours.", "NOT_FOUND")

	await db.$transaction([
		db.address.updateMany({ where: { dealerId }, data: { isDefault: false } }),
		db.address.update({ where: { id: target.id }, data: { isDefault: true } }),
	])
}

/**
 * Archives rather than deletes.
 *
 * A dealer shipping to jobsites accumulates addresses they will never use
 * again, and deleting one would take the destination off every past order that
 * went there. Archiving hides it from the picker and leaves the record intact.
 *
 * An order still being built is the one case where archiving would strand
 * something, so the draft is moved back to the default first.
 */
export async function archiveAddress(dealerId: string, addressId: string) {
	const target = await db.address.findFirst({
		where: { id: addressId, dealerId },
		select: { id: true, isDefault: true },
	})
	if (!target) throw new AddressError("That address is not yours.", "NOT_FOUND")

	const remaining = await db.address.count({
		where: { dealerId, isActive: true, id: { not: target.id } },
	})
	if (remaining === 0) {
		throw new AddressError(
			"This is the only address on the account. Add another before removing this one.",
			"IN_USE",
		)
	}

	await db.$transaction(async (tx) => {
		await tx.address.update({
			where: { id: target.id },
			data: { isActive: false, isDefault: false },
		})

		// Anything still open pointed at it has to go somewhere.
		await tx.order.updateMany({
			where: {
				dealerId,
				shipToAddressId: target.id,
				status: { in: ["DRAFT", "CHANGES_REQUESTED"] },
			},
			data: { shipToAddressId: null },
		})

		if (target.isDefault) {
			const next = await tx.address.findFirst({
				where: { dealerId, isActive: true },
				select: { id: true },
				orderBy: { createdAt: "asc" },
			})
			if (next) {
				await tx.address.update({ where: { id: next.id }, data: { isDefault: true } })
			}
		}
	})
}
