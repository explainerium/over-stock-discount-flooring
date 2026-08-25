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
	// Empty is the same as unset — a blank field in a hosting dashboard is not
	// an address. Missing is not fatal here: the sink still records the whole
	// message, and dropping it would lose the invite and reset links that are
	// the only way into an account until the mailbox exists.
	const from = process.env.EMAIL_FROM?.trim() || null

	// Deduplicated, and never addressed and copied at once. Who belongs on the
	// list is decided by the notifications layer — this only has to send it.
	const cc = (options.cc ?? []).filter(
		(address, index, all) => address !== options.to && all.indexOf(address) === index,
	)

	const message: EmailMessage & { from: string | null } = {
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
