import "server-only"
import { signParams } from "./sign"

/**
 * Cloudinary, for product photographs.
 *
 * Uploads go from the owner's browser straight to Cloudinary, so a photo never
 * passes through a serverless function — which would cap it at the 1 MB server
 * action limit and pay for the bandwidth twice. The server's only part is to
 * sign the request, which is what proves the upload came from a signed-in
 * member of staff. The API secret never leaves the server.
 *
 * No SDK: a signature is one SHA-1 over sorted parameters, and the SDK would
 * add a dependency to do that.
 */

/** Everything lands under one folder, so the client's media library stays tidy. */
export const PRODUCT_FOLDER = "products"

interface Credentials {
	cloudName: string
	apiKey: string
	apiSecret: string
}

function credentials(): Credentials | null {
	const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()
	const apiKey = process.env.CLOUDINARY_API_KEY?.trim()
	const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim()
	if (!cloudName || !apiKey || !apiSecret) return null
	return { cloudName, apiKey, apiSecret }
}

export function cloudinaryConfigured(): boolean {
	return credentials() !== null
}

export interface SignedUpload {
	url: string
	/** The exact fields the browser must send alongside the file. */
	fields: Record<string, string>
}

/**
 * A one-off permission to upload one image into the products folder.
 *
 * Cloudinary rejects a signature older than an hour, so one issued now and
 * replayed tomorrow is worthless.
 */
export function signProductUpload(): SignedUpload | null {
	const creds = credentials()
	if (!creds) return null

	const params = {
		folder: PRODUCT_FOLDER,
		timestamp: Math.floor(Date.now() / 1000),
		// Keep the file's own name in the public id (plus a short suffix so two
		// "swatch.jpg" uploads never overwrite each other). A readable id is
		// what lets someone find a photo in the media library later.
		unique_filename: "true",
		use_filename: "true",
	}

	return {
		url: `https://api.cloudinary.com/v1_1/${creds.cloudName}/image/upload`,
		fields: {
			...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
			api_key: creds.apiKey,
			signature: signParams(params, creds.apiSecret),
		},
	}
}
