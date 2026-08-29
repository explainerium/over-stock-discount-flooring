import "server-only"
import { db } from "@/server/db/client"
import { pruneExpiredSessions } from "@/server/auth/session"
import { notifyResaleCertsExpiring } from "@/server/notifications/dealers"
import { notifyQboNeedsAttention } from "@/server/notifications/quickbooks"
import { checkConnection, qboStatus } from "@/server/repositories/quickbooks"

/**
 * Scheduled work.
 *
 * Kept as a registry rather than one route per job, so adding the QuickBooks
 * health check later is a line here and a line in the schedule, not another
 * endpoint to secure. The resale certificate reminder below arrived that way.
 *
 * Every job returns a count and nothing else. A cron run that says "0" is proof
 * it ran; one that returns nothing is indistinguishable from one that never
 * fired.
 */

export interface JobResult {
	job: string
	/**
	 * What the run touched. Rows removed for a sweep, dealers reported for a
	 * reminder — deliberately not named `removed`, now that not every job
	 * deletes anything.
	 */
	count: number
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

/**
 * How far ahead a lapsing resale certificate is worth mentioning.
 *
 * Thirty days is roughly how long it takes a dealer to find the form, get it
 * signed and send it back, which is the whole point of the notice.
 */
const RESALE_NOTICE_DAYS = 30

/**
 * Resale certificates about to lapse, and the ones that already have.
 *
 * A tax-exempt dealer whose certificate has expired is not tax-exempt. The
 * expiry has been a column since the first migration with nothing acting on it,
 * so a date could pass unnoticed and every invoice after it would be wrong in a
 * way that is expensive to unwind months later.
 *
 * Stateless on purpose. Nothing records who has already been told, because the
 * message is a list of what is true this Monday rather than a per-dealer alert
 * — so a missed run costs a week of notice instead of a reminder that never
 * arrives, and there is no table to keep in step.
 *
 * Suspended accounts are left out. They cannot order, so their paperwork is not
 * urgent, and listing them would train the owner to skim the message.
 */
async function remindExpiringResaleCerts(): Promise<number> {
	const now = new Date()
	const horizon = new Date(now.getTime() + RESALE_NOTICE_DAYS * 24 * 60 * 60 * 1000)

	const dealers = await db.dealer.findMany({
		where: {
			taxExempt: true,
			status: { not: "SUSPENDED" },
			resaleCertExpiresAt: { not: null, lte: horizon },
		},
		select: { companyName: true, resaleCertExpiresAt: true },
		// Expired first, then whichever lapses soonest — the order the owner
		// would deal with them in.
		orderBy: { resaleCertExpiresAt: "asc" },
	})

	await notifyResaleCertsExpiring(
		dealers.map((dealer) => ({
			companyName: dealer.companyName,
			expiresOn: dealer.resaleCertExpiresAt!.toLocaleDateString("en-US"),
			// Floored, so a certificate expiring later today reads as 0 rather
			// than as tomorrow.
			daysLeft: Math.floor(
				(dealer.resaleCertExpiresAt!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
			),
		})),
	)

	return dealers.length
}

/**
 * How much warning is useful before the QuickBooks connection lapses.
 *
 * Three weeks. Long enough that a run can be missed and the owner still hears
 * in time, short enough that the message is about something imminent rather
 * than something he will forget.
 */
const QBO_WARN_DAYS = 21

/**
 * Keeps QuickBooks alive, and says so when it will not stay that way.
 *
 * Two jobs in one, and they are the same job. Making a real call refreshes the
 * access token, and a refresh resets the hundred-day clock on the refresh
 * token — so a connection that is used weekly never expires on its own. What
 * this catches is the connection that has stopped working for a reason no
 * token expiry explains: somebody disconnected the app from inside QuickBooks,
 * which leaves tokens that look perfectly valid and calls that all fail.
 *
 * Silence when everything is fine. A weekly all-clear is the kind of mail
 * people filter, and the filter catches the one that mattered.
 */
async function checkQuickBooks(): Promise<number> {
	const status = await qboStatus()
	if (!status.connected) return 0

	const health = await checkConnection()
	const daysLeft = status.daysUntilReconnect ?? 0

	if (health.ok && daysLeft > QBO_WARN_DAYS) return 0

	await notifyQboNeedsAttention({ working: health.ok, detail: health.detail, daysLeft })
	return 1
}

/** Everything the scheduler may ask for, by name. */
export const JOBS: Record<string, () => Promise<number>> = {
	"prune-credentials": pruneExpiredCredentials,
	"resale-cert-reminders": remindExpiringResaleCerts,
	"qbo-health": checkQuickBooks,
}

export async function runJob(name: string): Promise<JobResult | null> {
	const job = JOBS[name]
	if (!job) return null

	return { job: name, count: await job() }
}
