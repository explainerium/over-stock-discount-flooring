import "server-only"
import { qboAttentionEmail, sendEmail } from "@/server/integrations/email"
import { staffRecipients } from "@/server/repositories/recipients"

/**
 * Telling the owner the connection needs him.
 *
 * The only notification in this system about the system itself, and it earns
 * its place: everything else here fails loudly in front of somebody, while a
 * lapsed QuickBooks connection fails silently for as long as it takes a dealer
 * to ask where their invoice is.
 *
 * Does not throw. The caller is a scheduled job.
 */
export async function notifyQboNeedsAttention(state: {
	working: boolean
	detail: string
	daysLeft: number
}): Promise<void> {
	try {
		const staff = await staffRecipients()
		if (!staff.to) return

		await sendEmail(qboAttentionEmail(state), { to: staff.to, cc: staff.cc })
	} catch (error) {
		console.error("[notify] could not send the QuickBooks warning", error)
	}
}
