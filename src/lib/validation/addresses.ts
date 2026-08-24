import { z } from "zod"

/**
 * Ship-to addresses.
 *
 * Validated as a freight destination, not as a postal address. The state and
 * the ZIP are what a carrier rates on, so those two are strict; everything else
 * is for the driver and is only checked for being present.
 */

/** Two letters, upper-cased for the dealer rather than refused. */
const state = z
	.string()
	.trim()
	.length(2, "Two-letter state, like NC")
	.toUpperCase()
	.regex(/^[A-Z]{2}$/, "Two-letter state, like NC")

const zip = z
	.string()
	.trim()
	.regex(/^\d{5}(-\d{4})?$/, "Five digits, like 27260")

export const addressSchema = z.object({
	label: z.string().trim().max(60).optional(),
	line1: z.string().trim().min(1, "Street address is needed.").max(120),
	line2: z.string().trim().max(120).optional(),
	city: z.string().trim().min(1, "City is needed.").max(80),
	state,
	zip,
	// Required rather than defaulted. These decide what freight costs, so a
	// caller that forgets to send one should be told, not quietly given an
	// address with no accessorials on it. Every form supplies all three.
	isResidential: z.boolean(),
	needsLiftgate: z.boolean(),
	limitedAccess: z.boolean(),
})

/**
 * The dealer id is never on the form — it comes from the session. The address
 * id is, because editing needs to name what it is editing, and it is scoped
 * against the session's dealer before anything is written.
 */
export const updateAddressSchema = addressSchema.extend({ addressId: z.string().min(1) })
export const addressIdSchema = z.object({ addressId: z.string().min(1) })
export const chooseShipToSchema = z.object({ addressId: z.string().min(1) })

export type AddressInput = z.infer<typeof addressSchema>
