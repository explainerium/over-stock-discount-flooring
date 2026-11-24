/**
 * Transactional email.
 *
 * Split provider from message on purpose. The client's mailbox does not exist
 * yet — order mail cannot be sent from the gmail.com address on the current
 * site, and the domain needs SPF, DKIM and DMARC before anything will land —
 * so the messages are written and testable now, and the delivery is one
 * environment variable away.
 *
 * That is also why the provider is an interface rather than a Resend import
 * scattered through the actions. If the client already has a Google Workspace
 * or wants to keep mail with their registrar, only this folder changes.
 */

export interface EmailMessage {
	to: string
	subject: string
	/** Always present. Plain text is what an old mail client and a spam filter read. */
	text: string
	html: string
	/** Standing recipients from EMAIL_ORDER_CC, plus anything a caller adds. */
	cc?: string[]
	replyTo?: string
}

export interface EmailProvider {
	readonly name: string
	/**
	 * The sender is null until the client has a mailbox on the business domain.
	 * Only a provider that really sends needs one — the sink records the
	 * message either way, which is what keeps invite and reset links
	 * recoverable in the meantime.
	 */
	send(message: EmailMessage & { from: string | null }): Promise<void>
}

/**
 * A rendered message, before it knows who it is going to.
 *
 * Templates return this. Keeping the recipient out means a template can be
 * rendered in a test, or written to disk in development, without inventing an
 * address for it.
 */
export interface RenderedEmail {
	subject: string
	text: string
	html: string
}
