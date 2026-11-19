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
const email = z.string().trim().toLowerCase().email("That does not look like an email address.")
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

/**
 * A sample request.
 *
 * Asks where to send it, because a sample has to go somewhere and collecting
 * the address afterwards costs an email and a day. Fulfilment stays manual in
 * Phase 1 — this creates a lead the owner works from, nothing more.
 */
export const sampleRequestSchema = z.object({
	name,
	email,
	phone,
	productId: z.string().min(1),
	address: z.string().trim().min(1, "Where should we send it?").max(300),
	message: z.string().trim().max(1000).optional(),
	website: z.string().max(0).optional(),
})

/** The product id comes from the page, so the form never registers it. */
export const sampleRequestFormSchema = sampleRequestSchema.omit({ productId: true })

/**
 * "Inquire About Pricing", on every product page.
 *
 * The fields are the client's list, 19 November: who is asking, a name, phone
 * and email, roughly how much, and a ZIP code. Square feet means nothing for a
 * butcher block, so a product that is not flooring asks how much in words
 * instead, and either is optional: a rough guess should not block the ask.
 */
export const CUSTOMER_TYPES = ["HOMEOWNER", "CONTRACTOR", "DEALER"] as const

export const priceInquirySchema = z.object({
	productId: z.string().min(1),
	customerType: z.enum(CUSTOMER_TYPES, {
		message: "Are you a homeowner, a contractor or a dealer?",
	}),
	name,
	phone: z.string().trim().min(7, "A phone number, please.").max(40),
	email,
	sqFt: z
		.string()
		.trim()
		.max(20)
		.optional()
		.refine(
			(value) => !value || /^\d+(\.\d+)?$/.test(value.replace(/,/g, "")),
			"Square feet as a number, like 1200.",
		),
	quantity: z.string().trim().max(120).optional(),
	zip: z
		.string()
		.trim()
		.regex(/^\d{5}(-\d{4})?$/, "A 5-digit ZIP code, please."),
	message: z.string().trim().max(1000).optional(),
	website: z.string().max(0).optional(),
})

export const priceInquiryFormSchema = priceInquirySchema.omit({ productId: true })

export type PriceInquiryFormInput = z.infer<typeof priceInquiryFormSchema>

export type SampleRequestInput = z.infer<typeof sampleRequestSchema>
export type SampleRequestFormInput = z.infer<typeof sampleRequestFormSchema>

export type ContactInput = z.infer<typeof contactSchema>
export type DealerApplicationInput = z.infer<typeof dealerApplicationSchema>
