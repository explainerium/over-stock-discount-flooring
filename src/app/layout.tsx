import type { Metadata } from "next"
import { Open_Sans, Poppins } from "next/font/google"
import "./globals.css"

/**
 * The reference site's own pairing, read off it rather than guessed at:
 * Poppins 700 for every heading and button, Open Sans for body copy.
 *
 * An earlier pass here used Archivo and IBM Plex, chosen for being distinctive.
 * That was the wrong instinct for this brief — the client's stated goal is to
 * land close to that site, and the typeface is most of why it reads the way it
 * does.
 */
const poppins = Poppins({
	variable: "--font-poppins",
	subsets: ["latin"],
	weight: ["300", "400", "600", "700"],
	display: "swap",
})

const openSans = Open_Sans({
	variable: "--font-open-sans",
	subsets: ["latin"],
	display: "swap",
})

export const metadata: Metadata = {
	metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
	title: {
		default: "Overstock Discount Flooring — Rigid Core LVP, High Point NC",
		template: "%s · Overstock Discount Flooring",
	},
	description:
		"Factory-direct rigid core luxury vinyl plank, stocked by the pallet in High Point, North Carolina. Open to the public and to the trade.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html
			lang="en"
			className={`${poppins.variable} ${openSans.variable} h-full antialiased`}
		>
			<body className="flex min-h-full flex-col">{children}</body>
		</html>
	)
}
