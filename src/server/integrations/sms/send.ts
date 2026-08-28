import "server-only"
import { resolveProvider } from "./providers"
import type { RenderedSms, SmsMessage } from "./types"

/**
 * Sending.
 *
 * Failures are swallowed, on the same reasoning as the mail layer and the audit
 * log: an owner unable to receive an order because a carrier API timed out is
 * still better off than one whose dealer got an error page. The action has
 * already committed by the time this runs, the email has gone, and the admin
 * queue is the record either way.
 */

/**
 * Who gets told.
 *
 * An environment variable rather than a row in Settings, for now. It is the
 * kind of thing that could reasonably move there — a phone number is a
 * preference, not a secret — but it belongs with the Twilio credentials while
 * there are no Twilio credentials, and moving it later costs one migration and
 * one form field.
 */
function ownerNumber(): string | null {
	return process.env.OWNER_ALERT_NUMBER?.trim() || null
}

export async function alertOwner(rendered: RenderedSms): Promise<void> {
	const to = ownerNumber()
	// No number configured is not a failure — it is the project's normal state
	// until the client opens an account, and logging it on every order would
	// bury the things that are worth reading.
	if (!to) return

	const message: SmsMessage & { from: string | null } = {
		to,
		from: process.env.TWILIO_FROM_NUMBER?.trim() || null,
		text: rendered.text,
	}

	try {
		await resolveProvider().send(message)
	} catch (error) {
		console.error(`[sms] failed to alert the owner`, error)
	}
}
