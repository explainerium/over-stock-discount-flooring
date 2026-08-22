import "server-only"
import { db } from "@/server/db/client"
import type { Prisma } from "@/generated/prisma/client"

/**
 * Audit trail.
 *
 * Written for anything a dealer might later dispute or the owner might have to
 * account for — who suspended this company, who changed that price, when an
 * invitation went out and to whom.
 *
 * Failures are swallowed on purpose. A broken audit write must not roll back
 * the action it was recording: an owner unable to suspend a dealer because a
 * log insert failed is a worse outcome than a missing log line. It is reported
 * to the server console so the gap is at least visible.
 */
export async function audit(entry: {
	entity: string
	entityId: string
	action: string
	actorId?: string | null
	before?: Prisma.InputJsonValue
	after?: Prisma.InputJsonValue
}): Promise<void> {
	try {
		await db.auditLog.create({
			data: {
				entity: entry.entity,
				entityId: entry.entityId,
				action: entry.action,
				actorId: entry.actorId ?? null,
				before: entry.before,
				after: entry.after,
			},
		})
	} catch (error) {
		console.error("[audit] failed to record", entry.entity, entry.action, error)
	}
}
