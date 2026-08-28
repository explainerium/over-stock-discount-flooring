import "server-only"
import type { SmsMessage, SmsProvider } from "./types"

/**
 * Where a text actually goes.
 *
 * Two providers, mirroring the mail layer: Twilio for production and a sink for
 * everywhere else. There is no third "do nothing" mode — a message that is
 * neither sent nor recorded is a bug nobody can see.
 */

/** Twilio. Chosen because the plan already names it and the env vars exist. */
class TwilioProvider implements SmsProvider {
	readonly name = "twilio"

	constructor(
		private readonly accountSid: string,
		private readonly authToken: string,
	) {}

	async send(message: SmsMessage & { from: string | null }): Promise<void> {
		if (!message.from) {
			throw new Error("TWILIO_FROM_NUMBER is not set, so there is no number to send from.")
		}

		// Twilio's REST API is form-encoded and Basic-authenticated. No SDK: the
		// whole of what this needs is one POST, and a dependency here would be
		// more to keep current than to maintain.
		const response = await fetch(
			`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(this.accountSid)}/Messages.json`,
			{
				method: "POST",
				headers: {
					Authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64")}`,
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					To: message.to,
					From: message.from,
					Body: message.text,
				}),
			},
		)

		if (!response.ok) {
			// Twilio puts the useful part in the body, not the status line.
			const detail = await response.text().catch(() => "")
			throw new Error(`Twilio rejected the message (${response.status}): ${detail}`)
		}
	}
}

/**
 * The sink.
 *
 * Logs, and nothing more. The mail sink writes to disk as well because invite
 * and reset links are the only way into an account and losing one locks
 * somebody out; a text is a nudge towards a page that is already there, so
 * there is nothing here worth keeping a file for. Every event that produces one
 * of these produces an email too.
 */
class SinkProvider implements SmsProvider {
	readonly name = "sink"

	async send(message: SmsMessage & { from: string | null }): Promise<void> {
		console.info(`[sms] not sent — no provider configured\nTo: ${message.to}\n${message.text}`)
	}
}

/**
 * Picks one.
 *
 * Falls back to the sink unless all three Twilio variables are present, which
 * is the state the project is in until the client opens an account. Partly
 * configured is not configured: a SID with no token would fail on every send
 * and the failure would be swallowed one layer up.
 */
export function resolveProvider(): SmsProvider {
	// Trimmed to null first — each of these arrives as an empty string when
	// somebody creates the variable in a dashboard and leaves the value blank.
	const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() || null
	const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() || null

	if (accountSid && authToken) return new TwilioProvider(accountSid, authToken)

	if (process.env.NODE_ENV === "production" && (accountSid || authToken)) {
		// Half-configured in production is worth saying out loud. Nobody sets one
		// of these on purpose, and the alert it silently swallows is the one the
		// owner is standing in the warehouse waiting for.
		console.warn("[sms] Twilio is partly configured — falling back to the sink.")
	}

	return new SinkProvider()
}
