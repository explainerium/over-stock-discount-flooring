import "server-only"
import { db } from "@/server/db/client"
import {
	ACCESSORIALS,
	accessorialCodesOf,
	quoteFreight,
	type AccessorialCode,
	type FreightResult,
	type ZoneRates,
} from "@/server/domain/freight"

/**
 * The rate tables, and the one call that puts an order through them.
 *
 * The engine under `domain/freight` knows nothing about the database on
 * purpose. This is the layer that feeds it: it reads the zones the owner
 * maintains, works out what is actually on the truck, and hands both over.
 *
 * Freight is read on every cart render, so the two rate tables are fetched
 * together and neither is large — a zone table is a dozen rows that change a
 * few times a year, and there are three accessorials.
 */

const zoneSelect = {
	id: true,
	name: true,
	states: true,
	zips: true,
	perPalletRate: true,
	perBoxRate: true,
	minCharge: true,
	ftlThresholdPallets: true,
	ftlRate: true,
	isActive: true,
} as const

/** Everything the owner maintains, retired rows included. */
export async function listZones() {
	return db.freightZone.findMany({ select: zoneSelect, orderBy: { name: "asc" } })
}

export async function getZone(id: string) {
	return db.freightZone.findUnique({ where: { id }, select: zoneSelect })
}

export type ZoneInput = {
	name: string
	states: string[]
	zips: string[]
	perPalletRate?: string | null
	perBoxRate?: string | null
	minCharge?: string | null
	ftlThresholdPallets?: number | null
	ftlRate?: string | null
}

export async function createZone(input: ZoneInput) {
	return db.freightZone.create({ data: input, select: zoneSelect })
}

export async function updateZone(id: string, input: ZoneInput) {
	return db.freightZone.update({ where: { id }, data: input, select: zoneSelect })
}

/**
 * Retired rather than deleted.
 *
 * A zone that priced an order last spring is part of the answer to why that
 * order cost what it did. Turning it off stops it rating anything new and
 * leaves the record intact.
 */
export async function setZoneActive(id: string, isActive: boolean) {
	return db.freightZone.update({ where: { id }, data: { isActive }, select: zoneSelect })
}

/**
 * A row per charge, whether or not one has been saved yet.
 *
 * The set is fixed by the three flags an address carries, so the screen shows
 * all three from the first day rather than an empty table the owner has to
 * guess the contents of. An unsaved one has no rate, and nothing with no rate
 * is ever charged.
 */
export async function listAccessorialRates() {
	const saved = await db.accessorialRate.findMany()
	const byCode = new Map(saved.map((row) => [row.code, row]))

	return ACCESSORIALS.map(({ code, label }) => {
		const row = byCode.get(code)
		return {
			code,
			label: row?.label ?? label,
			rate: row?.rate.toString() ?? "",
			// Defaults to charged. Somebody typing a rate into this field means
			// to bill it, and a second tick to make it count would be a step that
			// only ever gets forgotten.
			isActive: row?.isActive ?? true,
		}
	})
}

/** Upserts, so a fresh database needs no seed row for these to be editable. */
export async function setAccessorialRate(code: string, rate: string, isActive: boolean) {
	const known = ACCESSORIALS.find((charge) => charge.code === code)
	if (!known) return null

	return db.accessorialRate.upsert({
		where: { code },
		create: { code, label: known.label, rate, isActive },
		update: { rate, isActive },
	})
}

/**
 * What the engine gets.
 *
 * Decimals go across as strings. They arrive from Prisma as its own Decimal
 * type, and the domain layer is not allowed to know that type exists — a string
 * is the one representation both sides already agree on and neither loses
 * precision to.
 */
function toZoneRates(zone: Awaited<ReturnType<typeof listZones>>[number]): ZoneRates {
	return {
		id: zone.id,
		name: zone.name,
		states: zone.states,
		zips: zone.zips,
		perPalletRate: zone.perPalletRate?.toString() ?? null,
		perBoxRate: zone.perBoxRate?.toString() ?? null,
		minCharge: zone.minCharge?.toString() ?? null,
		ftlThresholdPallets: zone.ftlThresholdPallets,
		ftlRate: zone.ftlRate?.toString() ?? null,
	}
}

/** A destination, from whichever of the two the order has. */
type Destination = {
	state: string
	zip: string
	isResidential?: boolean | null
	needsLiftgate?: boolean | null
	limitedAccess?: boolean | null
}

/**
 * The snapshot, if the order has one.
 *
 * A submitted order carries the address as it stood at submission, because that
 * is the place the freight was quoted against. Re-reading the live row would
 * let an address edit rewrite a quote the dealer has already been shown.
 */
function snapshotDestination(snapshot: unknown): Destination | null {
	if (!snapshot || typeof snapshot !== "object") return null
	const value = snapshot as Record<string, unknown>
	if (typeof value.state !== "string" || typeof value.zip !== "string") return null
	return {
		state: value.state,
		zip: value.zip,
		isResidential: value.isResidential === true,
		needsLiftgate: value.needsLiftgate === true,
		limitedAccess: value.limitedAccess === true,
	}
}

/**
 * Rates one order.
 *
 * Never throws for a shipment it cannot price — see the note on `FreightUnrated`.
 * "We cannot rate this one" is a normal answer here, and the caller shows the
 * reason rather than catching an exception.
 */
export async function quoteForOrder(orderId: string): Promise<FreightResult> {
	const order = await db.order.findUnique({
		where: { id: orderId },
		select: {
			palletCount: true,
			shipToSnapshot: true,
			shipToAddress: {
				select: {
					state: true,
					zip: true,
					isResidential: true,
					needsLiftgate: true,
					limitedAccess: true,
				},
			},
			dealer: { select: { freightMode: true, flatFreightRate: true } },
		},
	})

	if (!order) {
		return { quoted: false, code: "NO_DESTINATION", reason: "That order no longer exists." }
	}

	const destination = snapshotDestination(order.shipToSnapshot) ?? order.shipToAddress
	if (!destination) {
		return {
			quoted: false,
			code: "NO_DESTINATION",
			reason: "Choose where this is going and we will price the freight.",
		}
	}

	// Boxes are summed here rather than stored on the order. Unlike weight and
	// pallets they are only ever wanted at quote time, and one aggregate is
	// cheaper than a column that has to be kept true on every line edit.
	const [boxes, zones, accessorialRates] = await Promise.all([
		db.orderItem.aggregate({ where: { orderId }, _sum: { boxes: true } }),
		db.freightZone.findMany({ where: { isActive: true }, select: zoneSelect }),
		db.accessorialRate.findMany({ where: { isActive: true } }),
	])

	return quoteFreight({
		mode: order.dealer.freightMode,
		flatRate: order.dealer.flatFreightRate?.toString() ?? null,
		zones: zones.map(toZoneRates),
		accessorialRates: accessorialRates.map((charge) => ({
			code: charge.code,
			label: charge.label,
			rate: charge.rate.toString(),
		})),
		shipment: {
			state: destination.state,
			zip: destination.zip,
			pallets: order.palletCount ?? 0,
			boxes: boxes._sum.boxes ?? 0,
			accessorials: accessorialCodesOf(destination),
		},
	})
}

/**
 * Writes the quote onto the order, and leaves a typed one alone.
 *
 * Called at submission. An order that comes back after the owner asked for
 * changes gets re-rated, because the lines may have moved — but only if the
 * figure on it was rated in the first place. Once the owner has typed a number
 * by hand that is a decision, and a resubmission is not a reason to overwrite
 * it with a table's opinion.
 *
 * Returns the result so the caller can tell the dealer what happened.
 */
export async function stampFreight(orderId: string): Promise<FreightResult> {
	const current = await db.order.findUnique({
		where: { id: orderId },
		select: { freightSource: true },
	})
	if (current?.freightSource === "MANUAL") {
		return {
			quoted: false,
			code: "MANUAL_MODE",
			reason: "Freight on this order was set by hand and has been left as it is.",
		}
	}

	const result = await quoteForOrder(orderId)
	if (!result.quoted) return result

	await db.order.update({
		where: { id: orderId },
		data: {
			freight: result.amount.toString(),
			freightSource: result.source,
			accessorials: result.accessorials.map((charge) => charge.code as AccessorialCode),
		},
	})

	return result
}
