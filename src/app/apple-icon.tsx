import { ImageResponse } from "next/og"

/**
 * The home-screen icon.
 *
 * Separate from `icon.svg` because Safari does not take SVG for a touch icon —
 * without a PNG here an iPhone saves a screenshot of the page instead, which is
 * what the current site does and it looks like a mistake.
 *
 * Drawn rather than exported, so there is no binary in the repo to keep in step
 * with the mark. It becomes an image file the moment the client sends a logo.
 */
export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				background: "#231f20",
				color: "#ffffff",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				letterSpacing: 2,
			}}
		>
			<div style={{ fontSize: 62, fontWeight: 700, lineHeight: 1 }}>ODF</div>
			<div style={{ fontSize: 13, opacity: 0.65, marginTop: 10, letterSpacing: 4 }}>
				OVERSTOCK
			</div>
		</div>,
		size,
	)
}
