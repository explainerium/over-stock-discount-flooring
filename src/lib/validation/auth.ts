import { z } from "zod"

/**
 * Auth schemas, shared by the client form and the server action.
 *
 * The same object validates in both places on purpose. Client-side validation
 * is a convenience — it stops a round trip for an empty field — and is trivially
 * bypassed, so the action re-runs it before touching the database. One schema
 * means the two cannot drift into disagreeing about what a valid password is.
 */

const email = z
	.string()
	.trim()
	.min(1, "Email is required.")
	.email("That does not look like an email address.")
	.toLowerCase()

/**
 * Length, not composition.
 *
 * Current NIST guidance is to require length and drop the
 * uppercase-number-symbol rules, which mostly produce `Password1!` and a
 * sticky note. Twelve is comfortably above the floor and still typeable by
 * someone standing at a trade counter.
 */
const password = z
	.string()
	.min(12, "Use at least 12 characters.")
	.max(200, "That password is too long.")

export const loginSchema = z.object({
	email,
	// Not `password` — an existing account may predate any rule we set, and
	// telling someone their real password is "too short" at the login screen is
	// both useless and a hint.
	password: z.string().min(1, "Password is required."),
	redirectTo: z.string().optional(),
})

export const forgotPasswordSchema = z.object({ email })

export const resetPasswordSchema = z
	.object({
		token: z.string().min(1),
		password,
		confirmPassword: z.string(),
	})
	.refine((values) => values.password === values.confirmPassword, {
		message: "The two passwords do not match.",
		path: ["confirmPassword"],
	})

/**
 * Accepting an invite. The dealer sets their own password and fills in who they
 * are — the owner only supplied an email address.
 */
export const acceptInviteSchema = z
	.object({
		token: z.string().min(1),
		firstName: z.string().trim().min(1, "First name is required.").max(80),
		lastName: z.string().trim().min(1, "Last name is required.").max(80),
		phone: z.string().trim().max(40).optional(),
		password,
		confirmPassword: z.string(),
	})
	.refine((values) => values.password === values.confirmPassword, {
		message: "The two passwords do not match.",
		path: ["confirmPassword"],
	})

export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>

/**
 * What every auth action returns.
 *
 * A failure carries a message for the form and, where it helps, the field to
 * attach it to. Actions that succeed by redirecting never return at all.
 */
export type ActionResult =
	| { ok: true; message?: string }
	| { ok: false; message: string; field?: string }
