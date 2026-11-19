import "server-only"
import { db } from "@/server/db/client"

/**
 * Settings the owner can change without a deploy.
 *
 * The table has existed since the first migration and nothing used it, which
 * meant everything it was meant to hold lived in environment variables — fine
 * for a secret, wrong for a preference. An owner who wants his bookkeeper
 * copied on order mail should not need a developer and a redeploy.
 *
 * Secrets stay in the environment. What belongs here is what a person would
 * reasonably want to change on a Tuesday.
 */

export const SETTINGS = {
	/** Addresses copied on every order notification. */
	orderMailCc: "order_mail_cc",
	/** Where inquiries, applications and messages from the site are sent. */
	leadMailTo: "lead_mail_to",
} as const

/** Empty means "the owner and admins", the same as order mail. */
export async function getLeadMailTo(): Promise<string[]> {
	const row = await db.setting.findUnique({
		where: { key: SETTINGS.leadMailTo },
		select: { value: true },
	})
	return row && Array.isArray(row.value)
		? row.value.filter((v): v is string => typeof v === "string")
		: []
}

export async function setLeadMailTo(addresses: string[]): Promise<void> {
	await db.setting.upsert({
		where: { key: SETTINGS.leadMailTo },
		create: { key: SETTINGS.leadMailTo, value: addresses },
		update: { value: addresses },
	})
}

/**
 * Reads a list of addresses.
 *
 * Falls back to EMAIL_ORDER_CC so nothing that was configured before this table
 * was used quietly stops working. Once the owner saves the setting, the
 * database wins — otherwise a stale env var would keep reappearing.
 */
export async function getOrderMailCc(): Promise<string[]> {
	const row = await db.setting.findUnique({
		where: { key: SETTINGS.orderMailCc },
		select: { value: true },
	})

	if (row && Array.isArray(row.value)) {
		return row.value.filter((v): v is string => typeof v === "string")
	}

	return (process.env.EMAIL_ORDER_CC ?? "")
		.split(",")
		.map((address) => address.trim())
		.filter(Boolean)
}

export async function setOrderMailCc(addresses: string[]): Promise<void> {
	await db.setting.upsert({
		where: { key: SETTINGS.orderMailCc },
		create: { key: SETTINGS.orderMailCc, value: addresses },
		update: { value: addresses },
	})
}
