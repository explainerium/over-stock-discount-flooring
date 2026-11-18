/**
 * A product description as the client writes it.
 *
 * His sheet uses one "• " line per point. Lines that start with a bullet (or a
 * dash) become a list; anything else stays a paragraph, so a description typed
 * as prose in admin still reads as prose.
 */
const BULLET = /^\s*[•\-–*]\s*/

export function ProductDescription({ text }: { text: string }) {
	const lines = text
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)

	// Consecutive bullet lines are grouped into one list.
	const blocks: { kind: "list" | "text"; lines: string[] }[] = []
	for (const line of lines) {
		const kind = BULLET.test(line) ? "list" : "text"
		const value = line.replace(BULLET, "")
		const last = blocks.at(-1)
		if (last && last.kind === kind && kind === "list") last.lines.push(value)
		else blocks.push({ kind, lines: [value] })
	}

	return (
		<div className="grid gap-3 text-sm leading-relaxed">
			{blocks.map((block, index) =>
				block.kind === "list" ? (
					<ul key={index} className="grid list-disc gap-1 pl-5">
						{block.lines.map((line, i) => (
							<li key={i}>{line}</li>
						))}
					</ul>
				) : (
					<p key={index}>{block.lines[0]}</p>
				),
			)}
		</div>
	)
}

/** The first line, without its bullet: a fallback meta description. */
export function firstLine(text: string | null | undefined): string | null {
	const line = text
		?.split(/\r?\n/)
		.map((value) => value.replace(BULLET, "").trim())
		.find(Boolean)
	return line ?? null
}
