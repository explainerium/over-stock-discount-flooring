/**
 * Auth constants with no dependencies.
 *
 * Kept in its own module because middleware imports the cookie name, and
 * middleware runs on the Edge runtime. Importing it from `server/auth/session`
 * would drag the Prisma client into the Edge bundle through the import chain —
 * session → db/client → generated client — which either fails to build or
 * ships a runtime that cannot run there.
 *
 * Nothing in this file may import anything.
 */

export const SESSION_COOKIE = "odf_session"

/**
 * Header the proxy stamps the request path onto.
 *
 * Server components cannot read the current pathname, so the guards have no way
 * to build a `?redirectTo=` on their own. The proxy already sees every request
 * to a protected route, so it passes the path along.
 */
export const PATHNAME_HEADER = "x-pathname"
