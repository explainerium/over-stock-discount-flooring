import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * The module reads the environment once, at import. Every case therefore needs
 * a fresh module registry — reusing the import would test the first case four
 * times over.
 */
async function load(env: Record<string, string | undefined>) {
	vi.resetModules()
	for (const [key, value] of Object.entries(env)) {
		if (value === undefined) delete process.env[key]
		else process.env[key] = value
	}
	return import("./site")
}

const KEYS = ["SITE_URL", "VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL"]
const saved: Record<string, string | undefined> = {}

beforeEach(() => {
	for (const key of KEYS) {
		saved[key] = process.env[key]
		delete process.env[key]
	}
})

afterEach(() => {
	for (const key of KEYS) {
		if (saved[key] === undefined) delete process.env[key]
		else process.env[key] = saved[key]
	}
})

describe("where the site thinks it lives", () => {
	it("prefers what somebody set by hand", async () => {
		// This is how a custom domain takes over from the Vercel one.
		const { SITE_URL } = await load({
			SITE_URL: "https://overstockdiscountflooring.com",
			VERCEL_PROJECT_PRODUCTION_URL: "odf.vercel.app",
		})
		expect(SITE_URL).toBe("https://overstockdiscountflooring.com")
	})

	it("falls back to the host's own production domain", async () => {
		// The first deploy cannot know its URL in advance, so the host supplies
		// it. Without this, invite links on day one would point at localhost.
		const { SITE_URL } = await load({ VERCEL_PROJECT_PRODUCTION_URL: "odf.vercel.app" })
		expect(SITE_URL).toBe("https://odf.vercel.app")
	})

	it("uses the per-deployment URL only when there is nothing better", async () => {
		// Right for a preview; wrong for production, where it would change on
		// every push and churn every canonical URL.
		const { SITE_URL } = await load({ VERCEL_URL: "odf-git-branch-abc.vercel.app" })
		expect(SITE_URL).toBe("https://odf-git-branch-abc.vercel.app")
	})

	it("treats an empty variable as unset rather than as a value", async () => {
		// A blank field in a hosting dashboard produces "", and `??` does not
		// substitute for it — which is what took the first build down.
		const { SITE_URL } = await load({ SITE_URL: "", VERCEL_URL: "  " })
		expect(SITE_URL).toBe("http://localhost:3000")
	})

	it("steps past a typo instead of failing", async () => {
		const { SITE_URL } = await load({
			SITE_URL: "overstockdiscountflooring.com",
			VERCEL_PROJECT_PRODUCTION_URL: "odf.vercel.app",
		})
		expect(SITE_URL).toBe("https://odf.vercel.app")
	})

	it("never doubles the slash", async () => {
		const { siteUrl } = await load({ SITE_URL: "https://odf.vercel.app/" })
		expect(siteUrl("/products")).toBe("https://odf.vercel.app/products")
	})
})
