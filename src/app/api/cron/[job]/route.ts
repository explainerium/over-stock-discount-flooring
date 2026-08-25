import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { JOBS, runJob } from "@/server/jobs"

/**
 * The scheduled-work endpoint.
 *
 * One route for every job, named in the path, because the caller changes at
 * handover and the jobs should not. Vercel Cron hits this today; system cron on
 * a VPS hits the same URL later with the same header.
 *
 * Dynamic on purpose — it must never be answered from a cache.
 */
export const dynamic = "force-dynamic"

/**
 * Compares in constant time.
 *
 * A plain `===` on a secret leaks its length and then its content to anyone
 * patient enough to measure. Lengths are compared first because
 * `timingSafeEqual` throws on a mismatch, and that throw is itself a signal.
 */
function secretMatches(given: string, expected: string): boolean {
	const a = Buffer.from(given)
	const b = Buffer.from(expected)
	return a.length === b.length && timingSafeEqual(a, b)
}

export async function GET(request: Request, { params }: { params: Promise<{ job: string }> }) {
	const expected = process.env.CRON_SECRET

	// An unset secret closes the endpoint rather than opening it. A cron route
	// that runs for anybody because nobody configured it is worse than one that
	// never runs — the second failure gets noticed.
	if (!expected) {
		console.error("[cron] CRON_SECRET is not set — refusing to run anything.")
		return NextResponse.json({ error: "Not configured." }, { status: 503 })
	}

	const header = request.headers.get("authorization") ?? ""
	const token = header.startsWith("Bearer ") ? header.slice(7) : ""

	if (!secretMatches(token, expected)) {
		return NextResponse.json({ error: "No." }, { status: 401 })
	}

	const { job } = await params
	const result = await runJob(job)

	if (!result) {
		return NextResponse.json(
			{ error: `Unknown job. Known: ${Object.keys(JOBS).join(", ")}.` },
			{ status: 404 },
		)
	}

	console.info(`[cron] ${result.job}: removed ${result.removed}`)
	return NextResponse.json(result)
}
