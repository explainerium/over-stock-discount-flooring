import { NextResponse, type NextRequest } from "next/server"
import { PATHNAME_HEADER, SESSION_COOKIE } from "@/constants/auth"

/**
 * Cheap gate in front of the private areas.
 *
 * This checks only that a session cookie is PRESENT. It cannot check whether
 * the session is real: the proxy runs on the Edge runtime, where Prisma and
 * bcrypt are unavailable, so there is no way to reach the sessions table from
 * here. Getting that backwards is the standard way this setup breaks in
 * production.
 *
 * The actual decision — is the session valid, is the account still active, is
 * the company still active — belongs to `resolveSession()` in every server
 * component and action behind these routes. What this saves is a database
 * round trip and a rendered layout for a request that was never going to be
 * allowed, and it sends a signed-out dealer to the login screen instead of a
 * 401 page.
 */

const PROTECTED = ["/portal", "/admin"]

export default function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl

	if (!PROTECTED.some((prefix) => pathname.startsWith(prefix))) {
		return NextResponse.next()
	}

	if (request.cookies.has(SESSION_COOKIE)) {
		// Pass the path down so the guards can build a redirectTo if the session
		// behind this cookie turns out to be dead. A server component cannot read
		// the current pathname on its own, and the docs point at request headers
		// as the way to hand information from here to the render.
		const forwarded = new Headers(request.headers)
		forwarded.set(PATHNAME_HEADER, pathname + request.nextUrl.search)
		return NextResponse.next({ request: { headers: forwarded } })
	}

	const login = new URL("/login", request.url)
	// Send them back where they were headed once they are in.
	login.searchParams.set("redirectTo", pathname + request.nextUrl.search)
	return NextResponse.redirect(login)
}

export const config = {
	matcher: ["/portal/:path*", "/admin/:path*"],
}
