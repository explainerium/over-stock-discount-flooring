import "server-only"
import { resaleCertsExpiringEmail, sendEmail } from "@/server/integrations/email"
import { staffRecipients } from "@/server/repositories/recipients"

/**
 * Telling the owner about his own accounts.
 *
 * Beside `notifications/orders.ts` rather than inside it: the decision about
 * who hears about what belongs in this layer, and a reminder about a dealer's
 * paperwork is not an order event.
 *
 * Nothing here throws, on the same reasoning as everywhere else in this folder.
 * The caller is a scheduled job; failing the run because a mail API was slow
 * would turn a missed reminder into a red cron entry and fix nothing.
 */
export async function notifyResaleCertsExpiring(
	dealers: { companyName: string; expiresOn: string; daysLeft: number }[],
): Promise<void> {
	// No message when there is nothing to report. A weekly "all clear" is the
	// kind of mail people set a filter for, and the filter catches the one that
	// mattered.
	if (dealers.length === 0) return

	try {
		const staff = await staffRecipients()
		if (!staff.to) return

		await sendEmail(resaleCertsExpiringEmail({ dealers }), { to: staff.to, cc: staff.cc })
	} catch (error) {
		console.error("[notify] could not send the resale certificate reminder", error)
	}
}
