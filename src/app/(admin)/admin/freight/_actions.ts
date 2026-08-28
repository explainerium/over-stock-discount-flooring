"use server"

import { revalidatePath } from "next/cache"
import type { ActionResult } from "@/lib/validation/dealers"
import {
	accessorialSchema,
	amount,
	count,
	splitStates,
	splitZips,
	zoneActiveSchema,
	zoneSchema,
} from "@/lib/validation/freight"
import { requireStaff } from "@/server/auth/guards"
import { audit } from "@/server/repositories/audit"
import {
	createZone,
	getZone,
	setAccessorialRate,
	setZoneActive,
	updateZone,
	type ZoneInput,
} from "@/server/repositories/freight"

/**
 * The rate tables.
 *
 * These orchestrate and do not calculate, like every other action here: check
 * the caller, validate, call a repository, write an audit line, revalidate.
 * What a rate *means* belongs to `server/domain/freight`.
 *
 * Everything a person changes on this screen changes what a dealer is charged
 * to take delivery, so every one of them is audited with the figures before and
 * after. "Freight went up in March" needs to be answerable.
 */

type ZoneFields = {
	name: string
	states?: string
	zips?: string
	perPalletRate?: string
	perBoxRate?: string
	minCharge?: string
	ftlThresholdPallets?: string
	ftlRate?: string
}

function toZoneInput(fields: ZoneFields): ZoneInput {
	return {
		name: fields.name.trim(),
		states: splitStates(fields.states),
		zips: splitZips(fields.zips),
		perPalletRate: amount(fields.perPalletRate),
		perBoxRate: amount(fields.perBoxRate),
		minCharge: amount(fields.minCharge),
		ftlThresholdPallets: count(fields.ftlThresholdPallets),
		ftlRate: amount(fields.ftlRate),
	}
}

/** What the audit trail records. Decimals as strings, so a diff reads as money. */
function zoneShape(zone: Awaited<ReturnType<typeof getZone>>) {
	if (!zone) return null
	return {
		name: zone.name,
		states: zone.states,
		zips: zone.zips,
		perPalletRate: zone.perPalletRate?.toString() ?? null,
		perBoxRate: zone.perBoxRate?.toString() ?? null,
		minCharge: zone.minCharge?.toString() ?? null,
		ftlThresholdPallets: zone.ftlThresholdPallets,
		ftlRate: zone.ftlRate?.toString() ?? null,
		isActive: zone.isActive,
	}
}

export async function saveZoneAction(input: unknown): Promise<ActionResult<{ id: string }>> {
	const staff = await requireStaff()

	const parsed = zoneSchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}

	const { id, ...fields } = parsed.data
	const data = toZoneInput(fields)

	if (!id) {
		const created = await createZone(data)
		await audit({
			entity: "FreightZone",
			entityId: created.id,
			action: "zone:create",
			actorId: staff.id,
			after: zoneShape(created)!,
		})
		revalidatePath("/admin/freight")
		return { ok: true, message: `${created.name} added.`, data: { id: created.id } }
	}

	const before = await getZone(id)
	if (!before) return { ok: false, message: "That zone no longer exists." }

	const after = await updateZone(id, data)
	await audit({
		entity: "FreightZone",
		entityId: id,
		action: "zone:update",
		actorId: staff.id,
		before: zoneShape(before)!,
		after: zoneShape(after)!,
	})

	revalidatePath("/admin/freight")
	revalidatePath(`/admin/freight/${id}`)
	return { ok: true, message: "Saved.", data: { id } }
}

/**
 * Turns a zone off rather than deleting it.
 *
 * A zone that priced an order last spring is part of the answer to why that
 * order cost what it did.
 */
export async function setZoneActiveAction(input: unknown): Promise<ActionResult> {
	const staff = await requireStaff()

	const parsed = zoneActiveSchema.safeParse(input)
	if (!parsed.success) return { ok: false, message: "That is not a zone." }

	const before = await getZone(parsed.data.id)
	if (!before) return { ok: false, message: "That zone no longer exists." }

	const after = await setZoneActive(parsed.data.id, parsed.data.isActive)
	await audit({
		entity: "FreightZone",
		entityId: parsed.data.id,
		action: parsed.data.isActive ? "zone:activate" : "zone:retire",
		actorId: staff.id,
		before: { isActive: before.isActive },
		after: { isActive: after.isActive },
	})

	revalidatePath("/admin/freight")
	return {
		ok: true,
		message: after.isActive
			? `${after.name} is rating orders again.`
			: `${after.name} will not rate any new orders.`,
	}
}

export async function setAccessorialAction(input: unknown): Promise<ActionResult> {
	const staff = await requireStaff()

	const parsed = accessorialSchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}

	const { code, rate, isActive } = parsed.data
	const after = await setAccessorialRate(code, rate, isActive)
	if (!after) return { ok: false, message: "That charge is not one we know about." }

	await audit({
		entity: "AccessorialRate",
		entityId: code,
		action: "accessorial:update",
		actorId: staff.id,
		after: { rate: after.rate.toString(), isActive: after.isActive },
	})

	revalidatePath("/admin/freight")
	return { ok: true, message: `${after.label} saved.` }
}
