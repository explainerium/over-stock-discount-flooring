import "server-only"
import { resolveProvider } from "./providers"
import type { EmailMessage, RenderedEmail } from "./types"

/**
 * Sending.
 *
 * Failures are swallowed, on the same reasoning as the audit log: an owner
 * unable to approve an order because a mail API timed out is a worse outcome
 * than a missing notification. The action has already committed by the time
 * this runs, and the order page is the record either way.
 *
 * The failure is reported to the server console so the gap is visible rather
 * than merely survived.
 */

export interface SendOptions {
	to: string
	cc?: string[]
	replyTo?: string
}

export async function sendEmail(rendered: RenderedEmail, options: SendOptions): Promise<void> {
	const from = process.env.EMAIL_FROM

	if (!from) {
		console.error(`[mail] EMAIL_FROM is not set — dropped "${rendered.subject}"`)
		return
	}

	// Deduplicated, and never addressed and copied at once. Who belongs on the
	// list is decided by the notifications layer — this only has to send it.
	const cc = (options.cc ?? []).filter(
		(address, index, all) => address !== options.to && all.indexOf(address) === index,
	)

	const message: EmailMessage & { from: string } = {
		from,
		to: options.to,
		cc: cc.length > 0 ? cc : undefined,
		replyTo: options.replyTo,
		...rendered,
	}

	try {
		await resolveProvider().send(message)
	} catch (error) {
		console.error(`[mail] failed to send "${rendered.subject}" to ${options.to}`, error)
	}
}
