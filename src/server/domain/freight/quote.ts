import Decimal from "decimal.js"
import { findZone } from "./zones"
import type {
	AccessorialCharge,
	AccessorialCode,
	AppliedAccessorial,
	FreightBasis,
	FreightResult,
	Shipment,
	ZoneRates,
} from "./types"

/**
 * What the shipment costs to deliver.
 *
 * The plan's Phase 1 position: a zone table the owner maintains, rather than a
 * carrier API nobody has granted us access to yet. The value of doing it at all
 * is that the dealer sees a number in the cart instead of "we will tell you
 * later", and the owner approves most orders without retyping one.
 *
 * The order it decides in:
 *
 *   1. The dealer's arrangement. Flat and manual are agreements, not
 *      calculations, and neither should be second-guessed by a rate table.
 *   2. Truckload. Past roughly eight to ten pallets a shipment stops being LTL
 *      and a linear per-pallet rate badly overquotes it — so above the
 *      threshold the zone's own truckload rate applies, and where there is
 *      none the order goes for a manual quote rather than out at a number
 *      nobody would honour.
 *   3. Pallets if the zone rates by the pallet, boxes if it rates by the box.
 *   4. The zone minimum, as a floor on the linehaul.
 *   5. Accessorials, on top.
 *
 * Every branch that cannot produce a number says so and says why, and the
 * owner types the figure at approval — which is what happens today for every
 * order, so an unrated one is no worse off than it was.
 */

/** Money rounds the way an invoice rounds, and the way QuickBooks does. */
const money = (value: Decimal): Decimal => value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)

/**
 * A rate, or nothing.
 *
 * Zero is nothing. A zone left at 0 per pallet would otherwise quote free
 * delivery on every order that landed in it, silently and for as long as it
 * took somebody to notice.
 */
function rate(value: Decimal.Value | null | undefined): Decimal | null {
	if (value === null || value === undefined || value === "") return null
	const amount = new Decimal(value)
	return amount.isFinite() && amount.greaterThan(0) ? amount : null
}

/**
 * The charges the system knows about, in the order they read on an address.
 *
 * A fixed set, not a table the owner adds rows to. Each one exists because an
 * address carries a flag for it, so a fourth charge means a fourth flag and a
 * migration — which is the honest constraint, and better than an admin screen
 * that invites him to add a charge nothing will ever apply.
 */
export const ACCESSORIALS = [
	{ code: "RESIDENTIAL", label: "Residential" },
	{ code: "LIFTGATE", label: "Liftgate" },
	{ code: "LIMITED_ACCESS", label: "Limited access" },
] as const satisfies readonly { code: AccessorialCode; label: string }[]

/** The codes a destination earns, from the flags its address carries. */
export function accessorialCodesOf(address: {
	isResidential?: boolean | null
	needsLiftgate?: boolean | null
	limitedAccess?: boolean | null
}): AccessorialCode[] {
	const codes: AccessorialCode[] = []
	if (address.isResidential) codes.push("RESIDENTIAL")
	if (address.needsLiftgate) codes.push("LIFTGATE")
	if (address.limitedAccess) codes.push("LIMITED_ACCESS")
	return codes
}

function applicable(
	published: readonly AccessorialCharge[],
	wanted: readonly AccessorialCode[],
): AppliedAccessorial[] {
	const codes = new Set<string>(wanted)
	return published
		.filter((charge) => codes.has(charge.code))
		.map((charge) => ({ code: charge.code, label: charge.label, rate: rate(charge.rate) }))
		.filter((charge): charge is AppliedAccessorial => charge.rate !== null)
}

export interface QuoteInput {
	/** The dealer's arrangement. */
	mode: "ZONE" | "FLAT" | "LIVE" | "MANUAL"
	/** Read on FLAT and nowhere else. */
	flatRate?: Decimal.Value | null
	zones: readonly ZoneRates[]
	/** Only the active ones. Retiring a charge is how the owner stops billing it. */
	accessorialRates: readonly AccessorialCharge[]
	shipment: Shipment
}

export function quoteFreight(input: QuoteInput): FreightResult {
	const { mode, shipment } = input

	if (mode === "MANUAL") {
		return {
			quoted: false,
			code: "MANUAL_MODE",
			reason: "This dealer's freight is quoted by hand on every order.",
		}
	}

	if (mode === "LIVE") {
		return {
			quoted: false,
			code: "LIVE_UNAVAILABLE",
			reason: "Live carrier rates are not connected yet, so this one is quoted by hand.",
		}
	}

	if (mode === "FLAT") {
		const flat = rate(input.flatRate)
		if (!flat) {
			return {
				quoted: false,
				code: "NO_RATE",
				reason: "This dealer is on flat-rate freight, but no rate has been set on their account.",
			}
		}
		// A flat rate is the whole delivery charge, accessorials included — that
		// is what makes it flat. Adding a liftgate on top would put back exactly
		// the surprise the arrangement exists to remove.
		return {
			quoted: true,
			amount: money(flat),
			linehaul: money(flat),
			accessorialTotal: new Decimal(0),
			accessorials: [],
			basis: "FLAT",
			source: "FLAT",
			minChargeApplied: false,
		}
	}

	const zone = findZone(input.zones, shipment)
	if (!zone) {
		return {
			quoted: false,
			code: "NO_ZONE",
			reason: `No freight zone covers ${shipment.state} ${shipment.zip}.`,
		}
	}

	const accessorials = applicable(input.accessorialRates, shipment.accessorials)
	const accessorialTotal = money(
		accessorials.reduce<Decimal>((sum, charge) => sum.plus(charge.rate), new Decimal(0)),
	)

	const settled = (linehaul: Decimal, basis: FreightBasis, minChargeApplied: boolean) =>
		({
			quoted: true,
			amount: money(money(linehaul).plus(accessorialTotal)),
			linehaul: money(linehaul),
			accessorialTotal,
			accessorials,
			basis,
			source: "ZONE",
			zoneId: zone.id,
			zoneName: zone.name,
			minChargeApplied,
		}) as const

	const threshold = zone.ftlThresholdPallets ?? 0
	if (threshold > 0 && shipment.pallets >= threshold) {
		const ftl = rate(zone.ftlRate)
		if (!ftl) {
			return {
				quoted: false,
				code: "OVER_FTL",
				reason: `${shipment.pallets} pallets is a truckload for ${zone.name}, and no truckload rate is set — this one needs a quote.`,
			}
		}
		// Flat for the truck, not per pallet. That is the whole point of the
		// threshold: past it you are buying a trailer, not space on one.
		return settled(ftl, "FTL", false)
	}

	// Accessories that ship loose — a box of transition strips, a roll of
	// underlayment — have neither a pallet count nor a box count on file,
	// because the client has not yet said how those are packed or sold. Until
	// he does, an order made only of them is honest about needing a quote
	// rather than rated against numbers that are not there.
	if (shipment.pallets <= 0 && shipment.boxes <= 0) {
		return {
			quoted: false,
			code: "NO_RATE",
			reason: "Nothing on this order ships by the box or the pallet, so there is nothing to rate it against.",
		}
	}

	const perPallet = rate(zone.perPalletRate)
	const perBox = rate(zone.perBoxRate)

	let linehaul: Decimal
	let basis: FreightBasis

	if (shipment.pallets > 0 && perPallet) {
		linehaul = perPallet.times(shipment.pallets)
		basis = "PER_PALLET"
	} else if (shipment.boxes > 0 && perBox) {
		// Either the zone only rates by the box, or the order is small enough
		// that it never made a pallet. Both are the same arithmetic.
		linehaul = perBox.times(shipment.boxes)
		basis = "PER_BOX"
	} else {
		return {
			quoted: false,
			code: "NO_RATE",
			reason: `${zone.name} has no rate that fits this shipment.`,
		}
	}

	// A minimum is a floor on the linehaul, not on the bill. Carriers apply it
	// before accessorials and so does this — folding a liftgate into the
	// minimum would undercharge every small delivery that needed one.
	const floor = rate(zone.minCharge)
	if (floor && floor.greaterThan(linehaul)) {
		return settled(floor, basis, true)
	}

	return settled(linehaul, basis, false)
}
