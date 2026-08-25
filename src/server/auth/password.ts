import bcrypt from "bcryptjs"

/**
 * Password hashing.
 *
 * bcryptjs rather than the native `bcrypt` binding: native modules are
 * unreliable on serverless, and this runs on Vercel today. It is slower, which
 * for a password hash is not a defect.
 */

const DEFAULT_ROUNDS = 12

function rounds(): number {
	const configured = Number(process.env.AUTH_BCRYPT_ROUNDS)
	// 12 is the floor for production. A misconfigured env var silently dropping
	// this to 4 would be invisible and would matter.
	return Number.isInteger(configured) && configured >= DEFAULT_ROUNDS
		? configured
		: DEFAULT_ROUNDS
}

/**
 * A real bcrypt hash of a value nobody knows, used to burn the same amount of
 * time when there is nothing to compare against.
 *
 * Without it, "no such user" returns in about a millisecond and "wrong
 * password" takes a few hundred — which is a free membership oracle for anyone
 * willing to time the responses. Dealers here are named businesses, so
 * confirming one has an account is worth something to an attacker.
 */
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.HqLkQhOWQ6RQ0.mQVYUCUKPmpsvVGZm"

export async function hashPassword(plain: string): Promise<string> {
	return bcrypt.hash(plain, rounds())
}

/**
 * Verifies a password against a stored hash.
 *
 * `storedHash` is nullable on purpose: an invited user has no password until
 * they accept. Passing null still performs a full comparison against the dummy
 * hash before returning false, so the timing gives nothing away.
 */
export async function verifyPassword(plain: string, storedHash: string | null): Promise<boolean> {
	if (!storedHash) {
		await bcrypt.compare(plain, DUMMY_HASH)
		return false
	}
	return bcrypt.compare(plain, storedHash)
}

/** True when a stored hash was made with fewer rounds than we now require. */
export function needsRehash(storedHash: string): boolean {
	const cost = Number(storedHash.split("$")[2])
	return !Number.isInteger(cost) || cost < rounds()
}
