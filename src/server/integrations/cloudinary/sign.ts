import { createHash } from "node:crypto"

/**
 * Cloudinary's request signature: every signed parameter except the file and
 * the key, sorted by name, joined as a query string, with the secret appended,
 * then SHA-1.
 *
 * Kept apart from index.ts so it can be tested and used by the bulk upload
 * script without pulling in `server-only`.
 */
export function signParams(params: Record<string, string | number>, apiSecret: string): string {
	const payload = Object.keys(params)
		.sort()
		.map((key) => `${key}=${params[key]}`)
		.join("&")
	return createHash("sha1")
		.update(payload + apiSecret)
		.digest("hex")
}
