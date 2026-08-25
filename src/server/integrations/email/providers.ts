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

/**
 * Whether there is a writable disk to keep messages on.
 *
 * A deployed build has a read-only filesystem, so the sink logs instead. Kept
 * as a constant rather than a try-per-send so the decision is made once and is
 * readable from one line.
 */
const writable = process.env.NODE_ENV !== "production"

/** Postmark. Chosen because the plan already names it and the env vars exist. */
class PostmarkProvider implements EmailProvider {
	readonly name = "postmark"

	constructor(private readonly apiKey: string) {}

	async send(message: EmailMessage & { from: string | null }): Promise<void> {
		// Postmark cannot be asked to send from nowhere, and this is the layer
		// that actually knows it matters.
		if (!message.from) {
			throw new Error("EMAIL_FROM is not set, so there is no address to send from.")
		}

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
 * Where a message goes when nothing is configured to send it.
 *
 * On a machine with a writable disk it lands in `.mail/` as well as the log, so
 * the wording and the links can be read as a dealer would receive them. On a
 * host the filesystem is read-only, so the whole message goes to the log.
 *
 * Either way it is kept. The invite and password-reset links are the only way
 * into an account until the mailbox exists, and a message that is neither sent
 * nor recorded is a person locked out with nothing to show for it.
 */
class SinkProvider implements EmailProvider {
	readonly name = "sink"

	async send(message: EmailMessage & { from: string | null }): Promise<void> {
		const header = [
			`To: ${message.to}`,
			message.cc?.length ? `Cc: ${message.cc.join(", ")}` : null,
			`From: ${message.from ?? "(EMAIL_FROM is not set)"}`,
			`Subject: ${message.subject}`,
		]
			.filter(Boolean)
			.join("\n")

		// Written to disk only where there is a disk to write to. A deployed
		// build runs on a read-only filesystem, so on a host the whole message
		// goes to the log instead — the invite and reset links in it are the
		// only way into an account before the mailbox exists, and losing them
		// to a failed write would be worse than a noisy log.
		if (!writable) {
			console.info(`[mail] not sent — no provider configured\n${header}\n\n${message.text}`)
			return
		}

		const stamp = new Date().toISOString().replace(/[:.]/g, "-")
		const slug = message.subject
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "")
			.slice(0, 50)

		try {
			const dir = join(process.cwd(), ".mail")
			await mkdir(dir, { recursive: true })

			await Promise.all([
				writeFile(
					join(dir, `${stamp}-${slug}.txt`),
					`${header}\n\n${message.text}\n`,
					"utf8",
				),
				writeFile(join(dir, `${stamp}-${slug}.html`), message.html, "utf8"),
			])

			console.info(`[mail] ${message.to} — ${message.subject}  →  .mail/${stamp}-${slug}.txt`)
		} catch {
			// A read-only or full disk must not lose the message.
			console.info(`[mail] not sent — no provider configured\n${header}\n\n${message.text}`)
		}
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
	// Trimmed to null first. Every one of these arrives as an empty string when
	// somebody creates the variable in a dashboard and leaves the value blank,
	// and an empty string is not a configuration.
	const apiKey = process.env.EMAIL_API_KEY?.trim() || null
	const provider = process.env.EMAIL_PROVIDER?.trim() || "postmark"

	if (provider === "postmark" && apiKey) return new PostmarkProvider(apiKey)

	if (process.env.NODE_ENV === "production") {
		console.error(
			`[mail] EMAIL_API_KEY is not set — messages are being logged, not sent. ` +
				`Nobody is being notified of anything.`,
		)
	}

	return new SinkProvider()
}
