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
 * Drawn in code rather than exported from a design file for the same reason as
 * the touch icon: there is no logo yet, and a generated card stays in step with
 * the mark on the page instead of drifting from it. It becomes a real photograph
 * the day the client has one — which, per the plan, is the single asset that
 * would do most for this site.
 */
export const alt = "Overstock Discount Flooring — rigid core LVP, stocked by the pallet"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

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
			<div style={{ display: "flex", flexDirection: "column" }}>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						width: 132,
						height: 76,
						border: "4px solid #231f20",
						fontSize: 40,
						fontWeight: 700,
						letterSpacing: 1,
					}}
				>
					ODF
				</div>
				<div
					style={{
						marginTop: 12,
						fontSize: 15,
						fontWeight: 600,
						letterSpacing: 6,
					}}
				>
					OVERSTOCK
				</div>
			</div>

			<div style={{ display: "flex", flexDirection: "column" }}>
				<div style={{ fontSize: 68, fontWeight: 300, lineHeight: 1.15 }}>
					Rigid core LVP,
				</div>
				<div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.15 }}>
					stocked by the pallet
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
