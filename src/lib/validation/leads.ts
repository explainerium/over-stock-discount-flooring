import { z } from "zod"

/**
 * Lead capture.
 *
 * One table behind every public capture point — the contact form, the coverage
 * calculator, sample requests and dealer applications — so the owner has one
 * inbox rather than four.
 *
 * The client asked only for "name and phone number email". The current site
 * demands six required fields including a free-text question and a captcha,
 * which is a form built to be abandoned. This asks for a name, one way to reach
 * them, and nothing else that is mandatory.
 */

const name = z.string().trim().min(1, "Your name, please.").max(120)
const email = z
	.string()
	.trim()
	.toLowerCase()
	.email("That does not look like an email address.")
const phone = z.string().trim().max(40).optional()

export const contactSchema = z.object({
	name,
	email,
	phone,
	message: z.string().trim().max(4000).optional(),
	/**
	 * Honeypot. Hidden from people, irresistible to the bots that fill every
	 * input they find — which is most of them, and it costs a visitor nothing.
	 * The current site uses a plain-text number rendered as an image instead,
	 * which stops fewer bots and blocks screen readers outright.
	 */
	website: z.string().max(0).optional(),
})

export const dealerApplicationSchema = z.object({
	name,
	email,
	phone,
	company: z.string().trim().min(1, "Company name, please.").max(160),
	message: z.string().trim().max(4000).optional(),
	website: z.string().max(0).optional(),
})

export type ContactInput = z.infer<typeof contactSchema>
export type DealerApplicationInput = z.infer<typeof dealerApplicationSchema>
