import { z } from "zod"

/**
 * Dealer and invite schemas.
 *
 * Same objects on both sides of the wire, for the same reason as the auth
 * schemas: an action is a public endpoint and cannot trust that the browser ran
 * the validation it was given.
 *
 * The optional fields stay plain `string | undefined` rather than transforming
 * empty strings away inside the schema. A zod `.transform()` gives a resolver a
 * different output type from its input type, which react-hook-form then refuses
 * to reconcile with the form's own value type. Normalising in the action is one
 * line and keeps the form types honest.
 */

const optionalText = (max: number) => z.string().trim().max(max).optional()

/** An email field that also accepts being left empty. */
const optionalEmail = z
	.union([
		z.literal(""),
		z.string().trim().toLowerCase().email("That does not look like an email address."),
	])
	.optional()

/** `""` and whitespace mean "not provided", which the database stores as null. */
export function blank(value: string | undefined): string | undefined {
	const trimmed = value?.trim()
	return trimmed ? trimmed : undefined
}

export const createDealerSchema = z.object({
	companyName: z.string().trim().min(1, "Company name is required.").max(160),
	contactName: optionalText(120),
	contactEmail: optionalEmail,
	contactPhone: optionalText(40),
	notes: optionalText(2000),
	/**
	 * Optional, and the common path in practice — the owner adds a dealer
	 * because he is about to give them access, so making him visit a second
	 * screen to do it would be a step for no reason.
	 */
	inviteEmail: optionalEmail,
})

export const updateDealerSchema = createDealerSchema
	.omit({ inviteEmail: true })
	.extend({ id: z.string().min(1) })

export const inviteUserSchema = z.object({
	dealerId: z.string().min(1),
	email: z.string().trim().toLowerCase().email("That does not look like an email address."),
})

/**
 * What the invite form renders. The dealerId stays on the action schema only.
 *
 * A resolver runs before the submit handler, so an id that react-hook-form
 * never registered fails validation first and the handler is never reached —
 * from the outside, a button that does nothing.
 */
export const inviteUserFormSchema = inviteUserSchema.omit({ dealerId: true })
export type InviteUserFormInput = z.infer<typeof inviteUserFormSchema>

export const dealerIdSchema = z.object({ id: z.string().min(1) })
export const inviteIdSchema = z.object({ id: z.string().min(1) })
export const userIdSchema = z.object({ id: z.string().min(1) })

export type CreateDealerInput = z.infer<typeof createDealerSchema>
export type UpdateDealerInput = z.infer<typeof updateDealerSchema>
export type InviteUserInput = z.infer<typeof inviteUserSchema>

/**
 * An invite link can only be shown once.
 *
 * Only the token's hash is stored, so after the action returns there is no way
 * to reconstruct the URL — reissuing is the only option. The action therefore
 * hands the raw link back to the screen that asked for it, and the screen has
 * to put it in front of the owner then and there.
 */
export type ActionResult<T = undefined> =
	{ ok: true; message?: string; data?: T } | { ok: false; message: string; field?: string }

/**
 * The commercial terms on a dealer account.
 *
 * Separate from the contact details because they are edited by a different
 * person at a different moment — somebody fixes a phone number in passing, but
 * changing a freight mode or a tax exemption is a decision with money attached.
 *
 * Every field here already existed as a column and none of them had a UI, so
 * the system was quietly behaving as though every dealer were on the defaults.
 */
const dealerTermsFields = {
	paymentTerms: z.enum(["PREPAY", "COD", "NET_15", "NET_30", "NET_60"]),
	freightMode: z.enum(["ZONE", "FLAT", "LIVE", "MANUAL"]),
	/** Only meaningful on FLAT. Validated against the mode below. */
	flatFreightRate: z
		.string()
		.trim()
		.regex(/^\d+(\.\d{1,2})?$/, "An amount, like 250 or 250.00")
		.optional()
		.or(z.literal("")),
	minOrderValue: z
		.string()
		.trim()
		.regex(/^\d+(\.\d{1,2})?$/, "An amount, like 1500")
		.optional()
		.or(z.literal("")),
	taxExempt: z.boolean(),
	resaleCertExpiresAt: z
		.string()
		.trim()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "A date, like 2027-06-30")
		.optional()
		.or(z.literal("")),
} as const

/**
 * The rules that span more than one field, applied to both schemas.
 *
 * Written once and attached twice rather than built with `.omit()`. Zod throws
 * on `.omit()` when the schema already carries refinements — at runtime, not at
 * compile time, so it would have taken down every page importing this file with
 * nothing in the typecheck to warn about it.
 */
function withTermsRules<T extends z.ZodObject<z.ZodRawShape>>(schema: T) {
	return schema
		.refine((v) => v.freightMode !== "FLAT" || Boolean(v.flatFreightRate), {
			message: "A flat rate needs an amount.",
			path: ["flatFreightRate"],
		})
		.refine((v) => !v.taxExempt || Boolean(v.resaleCertExpiresAt), {
			// An exemption with no certificate date is one nobody can defend in
			// an audit, and it silently never expires.
			message: "When does their resale certificate expire?",
			path: ["resaleCertExpiresAt"],
		})
}

export const dealerTermsSchema = withTermsRules(
	z.object({ dealerId: z.string().min(1), ...dealerTermsFields }),
)

export const dealerTermsFormSchema = withTermsRules(z.object(dealerTermsFields))

export type DealerTermsInput = z.infer<typeof dealerTermsSchema>
export type DealerTermsFormInput = z.infer<typeof dealerTermsFormSchema>

/**
 * Standing recipients on order mail.
 *
 * One address per line rather than comma-separated: people paste addresses out
 * of a mail client one at a time, and a stray comma in a display name turns a
 * comma-separated list into two broken addresses.
 */
export const orderMailCcSchema = z.object({
	addresses: z
		.string()
		.trim()
		.max(2000)
		.refine(
			(value) =>
				value
					.split(/[\n,]/)
					.map((line) => line.trim())
					.filter(Boolean)
					.every((line) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(line)),
			"One email address per line, and each one has to look like an address.",
		),
})

export type OrderMailCcInput = z.infer<typeof orderMailCcSchema>

/** Splits the textarea into addresses, however the owner separated them. */
export function parseAddressList(value: string): string[] {
	return [
		...new Set(
			value
				.split(/[\n,]/)
				.map((line) => line.trim().toLowerCase())
				.filter(Boolean),
		),
	]
}
