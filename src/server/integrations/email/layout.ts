/**
 * The shell every message is poured into.
 *
 * Deliberately plain. Mail clients are twenty years behind browsers — Outlook
 * still renders through Word — so this is tables-free, single-column, inline
 * styles only, with no webfont and no image. The site's look survives as the
 * things that actually carry it: uppercase display type, no accent color, no
 * rounded corners, hairline rules.
 *
 * A dealer reading this on a phone in a truck is the case to design for, not a
 * desktop preview.
 */

const INK = "#231f20"
const MUTED = "#6b6b6b"
const RULE = "#d9d9d9"
const PAPER = "#ffffff"

/** No webfont will load. This is the closest stack that ships everywhere. */
// Single-quoted inside the stack on purpose. These land in a style="…"
// attribute, and a double quote here closes the attribute early — which
// silently drops every rule after it and renders the whole message in the
// client default serif.
const SANS = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`

export interface LayoutOptions {
	/** The one thing to do, if there is one. */
	action?: { label: string; href: string }
	/** Small print under the action — what happens next, or why they got this. */
	footnote?: string
}

export function wrap(bodyHtml: string, options: LayoutOptions = {}): string {
	const action = options.action
		? `<p style="margin:32px 0 0">
				<a href="${options.action.href}" style="display:inline-block;padding:14px 28px;background:${INK};color:${PAPER};font-family:${SANS};font-size:14px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;text-decoration:none">${options.action.label}</a>
			</p>`
		: ""

	// The URL is printed as well as linked. Some clients strip the button, and
	// an invite nobody can open is an invite that generates a phone call.
	const fallback = options.action
		? `<p style="margin:20px 0 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${MUTED}">
				If the button does not work, paste this into your browser:<br />
				<span style="color:${INK};word-break:break-all">${options.action.href}</span>
			</p>`
		: ""

	const footnote = options.footnote
		? `<p style="margin:24px 0 0;font-family:${SANS};font-size:13px;line-height:1.6;color:${MUTED}">${options.footnote}</p>`
		: ""

	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width,initial-scale=1" />
	</head>
	<body style="margin:0;padding:0;background:#efefef">
		<div style="max-width:560px;margin:0 auto;padding:32px 20px">
			<p style="margin:0 0 28px;font-family:${SANS};font-size:13px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${INK}">
				Overstock Discount Flooring
			</p>
			<div style="background:${PAPER};padding:32px;border:1px solid ${RULE}">
				${bodyHtml}
				${action}
				${fallback}
				${footnote}
			</div>
			<p style="margin:24px 0 0;font-family:${SANS};font-size:12px;line-height:1.7;color:${MUTED}">
				908 Old Thomasville Rd, High Point, NC 27260 &middot; (843) 318-9675
			</p>
		</div>
	</body>
</html>`
}

/** A paragraph in the body copy. */
export function p(text: string): string {
	return `<p style="margin:0 0 16px;font-family:${SANS};font-size:15px;line-height:1.65;color:${INK}">${text}</p>`
}

/** The opening line, larger than the rest. */
export function h(text: string): string {
	return `<p style="margin:0 0 20px;font-family:${SANS};font-size:19px;line-height:1.35;font-weight:700;color:${INK}">${text}</p>`
}

/** Something quoted back — an owner's reason, a dealer's note. */
export function quote(text: string): string {
	return `<div style="margin:0 0 20px;padding:14px 18px;border-left:3px solid ${INK};background:#f7f7f7;font-family:${SANS};font-size:15px;line-height:1.6;color:${INK};white-space:pre-wrap">${escape(text)}</div>`
}

/** A short list of facts: order number, total, where it is going. */
export function facts(rows: [string, string][]): string {
	const cells = rows
		.map(
			([label, value]) =>
				`<tr>
					<td style="padding:6px 16px 6px 0;font-family:${SANS};font-size:13px;color:${MUTED};vertical-align:top;white-space:nowrap">${label}</td>
					<td style="padding:6px 0;font-family:${SANS};font-size:14px;color:${INK};vertical-align:top">${value}</td>
				</tr>`,
		)
		.join("")

	return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:collapse">${cells}</table>`
}

/**
 * Escapes anything a person typed.
 *
 * Dealer notes and rejection reasons go straight into the HTML body. They are
 * written by people, but they are still untrusted input arriving in a document.
 */
export function escape(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
}
