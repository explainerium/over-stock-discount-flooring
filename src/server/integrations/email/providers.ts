import "server-only"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import type { EmailMessage, EmailProvider } from "./types"

/**
 * Where mail actually goes.
 *
 * Two providers today: Postmark for production, and a sink for everywhere
 * else. There is no third "do nothing" mode — a message that is neither sent
 * nor recorded is a bug nobody can see.
 */

/** Postmark. Chosen because the plan already names it and the env vars exist. */
class PostmarkProvider implements EmailProvider {
	readonly name = "postmark"

	constructor(private readonly apiKey: string) {}

	async send(message: EmailMessage & { from: string }): Promise<void> {
		const response = await fetch("https://api.postmarkapp.com/email", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				"X-Postmark-Server-Token": this.apiKey,
			},
			body: JSON.stringify({
				From: message.from,
				To: message.to,
				Cc: message.cc?.length ? message.cc.join(",") : undefined,
				ReplyTo: message.replyTo,
				Subject: message.subject,
				TextBody: message.text,
				HtmlBody: message.html,
				MessageStream: "outbound",
			}),
		})

		if (!response.ok) {
			// Postmark puts the useful part in the body, not the status line.
			const detail = await response.text().catch(() => "")
			throw new Error(`Postmark rejected the message (${response.status}): ${detail}`)
		}
	}
}

/**
 * The development sink.
 *
 * Writes each message to `.mail/` as well as logging it, so the wording and the
 * links can be read as a dealer would receive them rather than guessed at from
 * a template file. The invite and password-reset links in particular are only
 * usable if you can actually see them.
 */
class SinkProvider implements EmailProvider {
	readonly name = "sink"

	async send(message: EmailMessage & { from: string }): Promise<void> {
		const stamp = new Date().toISOString().replace(/[:.]/g, "-")
		const slug = message.subject
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "")
			.slice(0, 50)

		const dir = join(process.cwd(), ".mail")
		await mkdir(dir, { recursive: true })

		const header = [
			`To: ${message.to}`,
			message.cc?.length ? `Cc: ${message.cc.join(", ")}` : null,
			`From: ${message.from}`,
			`Subject: ${message.subject}`,
		]
			.filter(Boolean)
			.join("\n")

		await Promise.all([
			writeFile(join(dir, `${stamp}-${slug}.txt`), `${header}\n\n${message.text}\n`, "utf8"),
			writeFile(join(dir, `${stamp}-${slug}.html`), message.html, "utf8"),
		])

		console.info(`[mail] ${message.to} — ${message.subject}  →  .mail/${stamp}-${slug}.txt`)
	}
}

/**
 * Picks one.
 *
 * Falls back to the sink whenever the provider is not fully configured, which
 * is the state the project is in until the client's mailbox exists. In
 * production that fallback is logged loudly rather than passed over: silently
 * not emailing dealers is exactly the failure this system cannot afford.
 */
export function resolveProvider(): EmailProvider {
	const apiKey = process.env.EMAIL_API_KEY
	const provider = process.env.EMAIL_PROVIDER ?? "postmark"

	if (provider === "postmark" && apiKey) return new PostmarkProvider(apiKey)

	if (process.env.NODE_ENV === "production") {
		console.error(
			`[mail] EMAIL_API_KEY is not set — mail is being written to .mail/ instead of sent. ` +
				`Nobody is being notified of anything.`,
		)
	}

	return new SinkProvider()
}
