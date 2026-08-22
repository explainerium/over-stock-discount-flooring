import "server-only"
import { forbidden, unauthorized } from "next/navigation"
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
 * These run in server components and server actions, on the Node runtime.
 * Middleware cannot call them: it runs on the Edge runtime where Prisma is not
 * available, so middleware checks only whether a session cookie is present and
 * the real decision is made here.
 */

export type StaffRole = "OWNER" | "ADMIN"

const STAFF_ROLES: readonly StaffRole[] = ["OWNER", "ADMIN"]

export function isStaff(user: SessionUser | null): boolean {
	return user != null && STAFF_ROLES.includes(user.role as StaffRole)
}

/** The current user, or null. For pages that render differently when signed in. */
export async function getCurrentUser(): Promise<SessionUser | null> {
	return resolveSession()
}

/** Any signed-in user. Throws into Next's 401 boundary otherwise. */
export async function requireUser(): Promise<SessionUser> {
	const user = await resolveSession()
	if (!user) unauthorized()
	return user
}

/** Owner or admin. Everything under /admin goes through this. */
export async function requireStaff(): Promise<SessionUser> {
	const user = await requireUser()
	if (!isStaff(user)) forbidden()
	return user
}

/** Owner only — for actions an admin should not perform, such as removing another admin. */
export async function requireOwner(): Promise<SessionUser> {
	const user = await requireUser()
	if (user.role !== "OWNER") forbidden()
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
	if (user.role !== "DEALER_USER" || !user.dealerId) forbidden()
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
