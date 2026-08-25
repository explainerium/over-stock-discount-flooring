import "server-only"
import { db } from "@/server/db/client"
import { pruneExpiredSessions } from "@/server/auth/session"

/**
 * Scheduled work.
 *
 * Kept as a registry rather than one route per job, so adding the resale
 * certificate reminder or the QuickBooks health check later is a line here and
 * a line in the schedule, not another endpoint to secure.
 *
 * Every job returns a count and nothing else. A cron run that says "removed 0"
 * is proof it ran; one that returns nothing is indistinguishable from one that
 * never fired.
 */

export interface JobResult {
	job: string
	removed: number
}

/**
 * Expired credentials.
 *
 * Sessions, invitations and password-reset tokens all expire and none of them
 * were ever being cleared. The rows are harmless in principle — every one of
 * them is checked against `expiresAt` before it is honoured — but they are
 * credentials, and a table of dead credentials that only grows is the kind of
 * thing that turns a routine database dump into an incident.
 *
 * Used tokens go too. A used reset token cannot be redeemed twice, so keeping
 * the hash serves nothing.
 */
async function pruneExpiredCredentials(): Promise<number> {
	const now = new Date()

	const [sessions, invites, resets] = await Promise.all([
		pruneExpiredSessions(),
		db.invite.deleteMany({
			where: { OR: [{ expiresAt: { lte: now } }, { usedAt: { not: null } }] },
		}),
		db.passwordResetToken.deleteMany({
			where: { OR: [{ expiresAt: { lte: now } }, { usedAt: { not: null } }] },
		}),
	])

	return sessions + invites.count + resets.count
}

/** Everything the scheduler may ask for, by name. */
export const JOBS: Record<string, () => Promise<number>> = {
	"prune-credentials": pruneExpiredCredentials,
}

export async function runJob(name: string): Promise<JobResult | null> {
	const job = JOBS[name]
	if (!job) return null

	return { job: name, removed: await job() }
}
