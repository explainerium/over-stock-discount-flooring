import { z } from "zod"

/**
 * Freight zones and accessorial charges.
 *
 * Same object on both sides of the wire, for the reason every other schema here
 * gives: a server action is a public endpoint and cannot trust that the browser
 * ran the validation it was handed.
 *
 * States and ZIPs are typed as one comma-separated field rather than as arrays.
 * That is what a person maintaining a rate table actually types — "NC, SC, VA"
 * — and splitting it in the action keeps the form value a plain string, which
 * is the same reason the dealer schemas normalise rather than `.transform()`.
 */

/** An amount, or nothing. Blank is how the owner says a zone does not rate that way. */
const money = (example: string) =>
	z
		.string()
		.trim()
		.regex(/^\d+(\.\d{1,2})?$/, `An amount, like ${example}`)
		.optional()
		.or(z.literal(""))

export const zoneFormSchema = z
	.object({
		name: z.string().trim().min(1, "Give the zone a name.").max(80),
		states: z.string().trim().max(400).optional().or(z.literal("")),
		zips: z.string().trim().max(2000).optional().or(z.literal("")),
		perPalletRate: money("125"),
		perBoxRate: money("9.50"),
		minCharge: money("250"),
		ftlThresholdPallets: z
			.string()
			.trim()
			.regex(/^\d{1,2}$/, "A number of pallets, like 8")
			.optional()
			.or(z.literal("")),
		ftlRate: money("1450"),
	})
	.refine((zone) => Boolean(zone.states?.trim() || zone.zips?.trim()), {
		// A zone with neither covers nothing and will never rate an order. The
		// rates being blank is a legitimate work-in-progress; this is not.
		message: "A zone needs at least one state or ZIP, or it covers nowhere.",
		path: ["states"],
	})
	.refine((zone) => !zone.ftlRate?.trim() || Boolean(zone.ftlThresholdPallets?.trim()), {
		message: "A truckload rate needs the pallet count it starts at.",
		path: ["ftlThresholdPallets"],
	})

export const zoneSchema = zoneFormSchema.safeExtend({ id: z.string().min(1).optional() })

export const zoneIdSchema = z.object({ id: z.string().min(1) })
export const zoneActiveSchema = z.object({ id: z.string().min(1), isActive: z.boolean() })

export const accessorialSchema = z.object({
	code: z.string().trim().min(1).max(40),
	rate: z
		.string()
		.trim()
		.regex(/^\d+(\.\d{1,2})?$/, "An amount, like 110"),
	isActive: z.boolean(),
})

export type ZoneFormInput = z.infer<typeof zoneFormSchema>
export type AccessorialInput = z.infer<typeof accessorialSchema>

/**
 * "NC, SC , va" becomes ["NC", "SC", "VA"].
 *
 * Upper-cased and de-duplicated, because the engine compares against
 * upper-case and because a table maintained by hand over several years will
 * eventually have the same state in a row twice.
 */
export function splitStates(value: string | undefined): string[] {
	return dedupe(
		(value ?? "")
			.split(",")
			.map((state) => state.trim().toUpperCase())
			.filter(Boolean),
	)
}

/** Same, minus the upper-casing — a ZIP or a leading prefix of one. */
export function splitZips(value: string | undefined): string[] {
	return dedupe(
		(value ?? "")
			.split(",")
			.map((zip) => zip.trim())
			.filter(Boolean),
	)
}

/** `""` means "not set", which the database stores as null. */
export function amount(value: string | undefined): string | null {
	const trimmed = value?.trim()
	return trimmed ? trimmed : null
}

export function count(value: string | undefined): number | null {
	const trimmed = value?.trim()
	return trimmed ? Number(trimmed) : null
}

function dedupe(values: string[]): string[] {
	return [...new Set(values)]
}
