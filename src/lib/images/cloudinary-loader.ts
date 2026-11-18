"use client"

/**
 * The `next/image` loader.
 *
 * Product photographs live on Cloudinary, which resizes and re-encodes on its
 * own CDN — so the width and quality go into the URL and Cloudinary does the
 * work, rather than Vercel's optimiser. That keeps image transformations off
 * the hosting bill entirely, and it means the site behaves the same if it ever
 * moves from Vercel to a VPS, where there is no optimiser at all.
 *
 *   https://res.cloudinary.com/demo/image/upload/v1/products/oak.jpg
 *   → https://res.cloudinary.com/demo/image/upload/f_auto,c_limit,w_640,q_auto/v1/products/oak.jpg
 *
 * Anything that is not a Cloudinary upload — a file in public/, a pasted URL —
 * is served as it is. Relative paths get a width parameter only so Next.js can
 * tell the loader honoured it; a static file ignores the query string.
 */
const UPLOAD = "/image/upload/"

export default function cloudinaryLoader({
	src,
	width,
	quality,
}: {
	src: string
	width: number
	quality?: number
}): string {
	const at = src.indexOf(UPLOAD)

	if (src.startsWith("https://res.cloudinary.com/") && at !== -1) {
		const params = ["f_auto", "c_limit", `w_${width}`, `q_${quality ?? "auto"}`].join(",")
		const head = src.slice(0, at + UPLOAD.length)
		const tail = src.slice(at + UPLOAD.length)
		return `${head}${params}/${tail}`
	}

	if (src.startsWith("/")) return `${src}?w=${width}`
	return src
}
