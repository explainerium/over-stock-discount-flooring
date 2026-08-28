/**
 * Text messages to the owner.
 *
 * Same split as the email layer, and for the same reason: the client has no
 * Twilio account yet, so the messages are written and testable now and the
 * delivery is three environment variables away.
 *
 * Only one person ever receives one of these. That is not a limitation waiting
 * to be lifted — it is the point. The plan asks for SMS on a new order and a
 * new quote request because the owner is on a forklift and will not see the
 * email for two hours; anything less urgent than that belongs in mail, where it
 * can be read at a desk and kept.
 */

export interface SmsMessage {
	to: string
	/** Plain text, kept short. A carrier bills per 160-character segment. */
	text: string
}

export interface SmsProvider {
	readonly name: string
	/** The sender is null until a Twilio number exists; only a real one needs it. */
	send(message: SmsMessage & { from: string | null }): Promise<void>
}

/** A rendered message, before it knows who it is going to. */
export interface RenderedSms {
	text: string
}
