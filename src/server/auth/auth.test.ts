import { describe, expect, it } from "vitest"
import { hashPassword, needsRehash, verifyPassword } from "./password"
import { expiresAt, generateToken, hashToken, isExpired, TOKEN_TTL } from "./tokens"

describe("password hashing", () => {
	it("verifies a correct password", async () => {
		const hash = await hashPassword("correct horse battery staple")
		await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(true)
	})

	it("rejects a wrong password", async () => {
		const hash = await hashPassword("correct horse battery staple")
		await expect(verifyPassword("Correct horse battery staple", hash)).resolves.toBe(false)
		await expect(verifyPassword("", hash)).resolves.toBe(false)
	})

	it("salts, so the same password hashes differently every time", async () => {
		const [a, b] = await Promise.all([hashPassword("same"), hashPassword("same")])
		expect(a).not.toBe(b)
		await expect(verifyPassword("same", a)).resolves.toBe(true)
		await expect(verifyPassword("same", b)).resolves.toBe(true)
	})

	it("returns false — without throwing — when the user has no password yet", async () => {
		// An invited dealer who has not accepted has passwordHash = null. A login
		// attempt against them must fail like any other, not crash.
		await expect(verifyPassword("anything", null)).resolves.toBe(false)
	})

	it("takes comparable time whether or not the account exists", async () => {
		// The point is that "no such user" must not return noticeably faster than
		// "wrong password", or response timing tells an attacker which dealers
		// have accounts. Timing in a test runner is noisy, so this asserts only
		// that the null path does real work rather than returning instantly.
		const hash = await hashPassword("secret")

		const startReal = performance.now()
		await verifyPassword("wrong", hash)
		const real = performance.now() - startReal

		const startNull = performance.now()
		await verifyPassword("wrong", null)
		const nullPath = performance.now() - startNull

		expect(nullPath).toBeGreaterThan(real / 4)
	})

	it("flags hashes made with too low a work factor", async () => {
		expect(needsRehash("$2b$04$C6UzMDM.H6dfI/f/IKcEe.HqLkQhOWQ6RQ0.mQVYUCUKPmpsvVGZm")).toBe(true)
		expect(needsRehash(await hashPassword("x"))).toBe(false)
	})
})

describe("tokens", () => {
	it("never returns the same token twice", () => {
		const seen = new Set(Array.from({ length: 500 }, () => generateToken().token))
		expect(seen.size).toBe(500)
	})

	it("is url-safe and long enough to be unguessable", () => {
		const { token } = generateToken()
		// 32 random bytes in base64url — no +, / or = to break a query string.
		expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
	})

	it("hashes deterministically, so a token can be looked up by its digest", () => {
		const { token, tokenHash } = generateToken()
		expect(hashToken(token)).toBe(tokenHash)
		expect(tokenHash).toMatch(/^[a-f0-9]{64}$/)
	})

	it("does not store the token itself", () => {
		const { token, tokenHash } = generateToken()
		expect(tokenHash).not.toContain(token)
	})
})

describe("expiry", () => {
	const now = new Date("2026-08-22T12:00:00Z")

	it("keeps reset links far shorter-lived than sessions", () => {
		// A reset link sitting in an inbox is a standing key to the account.
		expect(TOKEN_TTL.passwordReset).toBeLessThan(TOKEN_TTL.invite)
		expect(TOKEN_TTL.invite).toBeLessThan(TOKEN_TTL.session)
	})

	it("computes expiry from a given instant", () => {
		expect(expiresAt(TOKEN_TTL.passwordReset, now).toISOString()).toBe("2026-08-22T13:00:00.000Z")
	})

	it("treats the exact expiry moment as expired", () => {
		expect(isExpired(now, now)).toBe(true)
		expect(isExpired(new Date(now.getTime() + 1), now)).toBe(false)
		expect(isExpired(new Date(now.getTime() - 1), now)).toBe(true)
	})
})
