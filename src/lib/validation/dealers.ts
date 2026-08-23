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
	.union([z.literal(""), z.string().trim().toLowerCase().email("That does not look like an email address.")])
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
	| { ok: true; message?: string; data?: T }
	| { ok: false; message: string; field?: string }
