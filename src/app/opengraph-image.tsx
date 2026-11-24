import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"
import { SHOWROOM } from "@/constants/catalog"

/**
 * What a shared link looks like.
 *
 * Every link to this site — the one the owner texts a dealer, the one a dealer
 * pastes into a group chat — currently previews as a blank card, because there
 * has never been an image behind it. This is the fallback for the whole site;
 * a route that wants its own puts an `opengraph-image` in its own segment.
 *
 * His logo (from his current site, public/brand/logo.png) over his own line,
 * "Quality Floors. Discount Prices.", in the site's heading colors: the light
 * half in wood, the bold half in teal.
 */
export const alt = "Overstock Discount Flooring — Quality Floors. Discount Prices."
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// Read once: the asset does not change between requests.
const logo = `data:image/png;base64,${await readFile(join(process.cwd(), "public/brand/logo.png"), "base64")}`

export default function OpenGraphImage() {
	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				background: "#ffffff",
				color: "#231f20",
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				padding: 72,
			}}
		>
			{/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain img only */}
			<img src={logo} alt="" width={200} height={169} />

			<div style={{ display: "flex", flexDirection: "column" }}>
				<div style={{ fontSize: 68, fontWeight: 300, lineHeight: 1.15, color: "#8a5d3b" }}>
					Quality Floors.
				</div>
				<div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.15, color: "#2e7d68" }}>
					Discount Prices.
				</div>
			</div>

			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 20,
					borderTop: "2px solid #d9d9d9",
					paddingTop: 28,
					fontSize: 22,
					color: "#5a5457",
				}}
			>
				<span>
					{SHOWROOM.city}, {SHOWROOM.state}
				</span>
				<span style={{ color: "#d9d9d9" }}>·</span>
				<span>Open to the public and to the trade</span>
			</div>
		</div>,
		size,
	)
}
