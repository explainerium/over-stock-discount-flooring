import type { Metadata } from "next"
import { Open_Sans, Poppins } from "next/font/google"
import { Analytics } from "@/components/shared/Analytics"
import { SITE_URL } from "@/constants/site"
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
	metadataBase: new URL(SITE_URL),
	title: {
		default: "Overstock Discount Flooring — Rigid Core LVP, High Point NC",
		template: "%s · Overstock Discount Flooring",
	},
	description:
		"Factory-direct rigid core luxury vinyl plank, stocked by the pallet in High Point, North Carolina. Open to the public and to the trade.",
	/**
	 * Set here so every page inherits it. Only the parts that are the same
	 * everywhere — the site name, the type, the locale; a route that wants its
	 * own title or image overrides those and the rest still carries.
	 *
	 * No `images` key: the `opengraph-image` file beside this one is picked up
	 * by the file convention, and naming it here as well would put two og:image
	 * tags on every page.
	 */
	openGraph: {
		type: "website",
		siteName: "Overstock Discount Flooring",
		locale: "en_US",
		url: "/",
	},
	twitter: { card: "summary_large_image" },
}

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html lang="en" className={`${poppins.variable} ${openSans.variable} h-full antialiased`}>
			<body className="flex min-h-full flex-col">
				{children}
				<Analytics />
			</body>
		</html>
	)
}
