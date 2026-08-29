import { randomBytes } from "node:crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { requireStaff } from "@/server/auth/guards"
import { QboError, authorizeUrl } from "@/server/integrations/quickbooks"

/**
 * Starts the QuickBooks connection.
 *
 * A route rather than a server action because the last thing it does is send
 * the browser to Intuit, and a redirect to a third party is not something a
 * form post should be doing on its own.
 *
 * Behind `requireStaff` like everything else under admin. Connecting the
 * client's accounting software is the single most consequential button on this
 * site.
 */
export const dynamic = "force-dynamic"

export const STATE_COOKIE = "qbo.oauth.state"

export async function GET() {
	await requireStaff()

	let url: string
	try {
		// Random, and checked on the way back. Without it, a link from anywhere
		// could connect the owner's QuickBooks to somebody else's app.
		const state = randomBytes(24).toString("base64url")

		const jar = await cookies()
		jar.set(STATE_COOKIE, state, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			// Long enough to pick a company and sign in, short enough that a
			// forgotten tab is not a standing invitation.
			maxAge: 10 * 60,
		})

		url = authorizeUrl(state)
	} catch (error) {
		const why = error instanceof QboError ? error.message : "QuickBooks could not be reached."
		redirect(`/admin/settings?qbo=${encodeURIComponent(why)}`)
	}

	redirect(url)
}
