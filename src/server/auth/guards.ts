import "server-only"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { PATHNAME_HEADER } from "@/constants/auth"
import { resolveSession, type SessionUser } from "./session"

/**
 * Access guards.
 *
 * The whole commercial value of this system is that one dealer never sees
 * another's pricing. That cannot rest on every query remembering to filter by
 * dealer — it takes one hurried `findMany` to leak a competitor's rates. So
 * dealer-scoped data is reached through `requireDealerScope()`, which returns
 * the id to filter on, and repositories take that scope as an argument rather
 * than deriving it themselves.
 *
 * These run in server components and server actions, on the Node runtime. The
 * proxy cannot call them: it runs on the Edge runtime where Prisma is not
 * available, so it checks only whether a session cookie is present and the real
 * decision is made here.
 *
 * Failures redirect rather than raising Next's `unauthorized()` / `forbidden()`
 * interrupts. Those are still behind an experimental flag, and the security
 * path of a client project is the wrong place to depend on one. It also reads
 * better here: there are exactly two audiences and each has a home, so sending
 * an owner who lands on /portal to /admin beats showing them a 403.
 */

export type StaffRole = "OWNER" | "ADMIN"

const STAFF_ROLES: readonly StaffRole[] = ["OWNER", "ADMIN"]

export function isStaff(user: SessionUser | null): boolean {
	return user != null && STAFF_ROLES.includes(user.role as StaffRole)
}

/** Where a signed-in user belongs. */
export function homeFor(user: SessionUser): string {
	return user.role === "DEALER_USER" ? "/portal" : "/admin"
}

/**
 * Sends the user to sign in, remembering where they were headed.
 *
 * The proxy already catches the common case — no cookie at all. This one fires
 * when a cookie exists but the session behind it does not: expired, revoked, or
 * belonging to an account that has since been disabled. Rare, but it is exactly
 * the moment a suspended dealer finds out, so it should land somewhere sensible
 * rather than on an error.
 */
async function toLogin(): Promise<never> {
	const pathname = (await headers()).get(PATHNAME_HEADER)
	redirect(pathname ? `/login?redirectTo=${encodeURIComponent(pathname)}` : "/login")
}

/** The current user, or null. For pages that render differently when signed in. */
export async function getCurrentUser(): Promise<SessionUser | null> {
	return resolveSession()
}

/** Any signed-in user. */
export async function requireUser(): Promise<SessionUser> {
	const user = await resolveSession()
	if (!user) await toLogin()
	return user!
}

/** Owner or admin. Everything under /admin goes through this. */
export async function requireStaff(): Promise<SessionUser> {
	const user = await requireUser()
	if (!isStaff(user)) redirect(homeFor(user))
	return user
}

/** Owner only — for actions an admin should not perform, such as removing another admin. */
export async function requireOwner(): Promise<SessionUser> {
	const user = await requireUser()
	if (user.role !== "OWNER") redirect(homeFor(user))
	return user
}

/**
 * The scope every dealer-facing query must be filtered by.
 *
 * Returns the dealer id as a non-null value so a repository cannot accidentally
 * be handed `undefined` and fall through to an unfiltered query — the failure
 * mode that leaks pricing. Staff do not get an implicit scope: an admin viewing
 * a dealer's orders passes that dealer's id explicitly, which keeps the
 * privileged path visible in the code rather than implied.
 */
export interface DealerScope {
	user: SessionUser
	dealerId: string
}

export async function requireDealerScope(): Promise<DealerScope> {
	const user = await requireUser()
	if (user.role !== "DEALER_USER" || !user.dealerId) redirect(homeFor(user))
	return { user, dealerId: user.dealerId }
}

/**
 * Resolves the dealer a staff member is acting on behalf of.
 *
 * Used by admin screens that render one dealer's orders or prices. Kept as its
 * own function so that "staff may read any dealer" is a decision written down
 * in one place instead of a missing `where` clause somewhere.
 */
export async function requireStaffActingOnDealer(dealerId: string): Promise<DealerScope> {
	const user = await requireStaff()
	return { user, dealerId }
}
