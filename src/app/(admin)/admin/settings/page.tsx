import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireStaff } from "@/server/auth/guards"
import { getOrderMailCc } from "@/server/repositories/settings"
import { AccountSettings } from "@/components/shared/AccountSettings"
import { OrderMailCcForm } from "./_components/OrderMailCcForm"

export const metadata = { title: "Settings" }

/**
 * The things the owner should be able to change without ringing us.
 *
 * Only what a person would reasonably want to change on a Tuesday. Secrets and
 * connection strings stay in the environment, where a mistake is a deploy away
 * from being caught rather than live immediately.
 */
export default async function SettingsPage() {
	const user = await requireStaff()
	const cc = await getOrderMailCc()

	return (
		<div className="grid max-w-2xl gap-6">
			<div>
				<h1 className="text-xl font-semibold tracking-wide uppercase">Settings</h1>
				<p className="text-muted-foreground text-sm">
					Changes here take effect immediately.
				</p>
			</div>

			<AccountSettings email={user.email} />

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Order email</CardTitle>
					<CardDescription>
						Orders already go to you and to any admin accounts. Anyone added here is
						copied as well.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<OrderMailCcForm addresses={cc} />
				</CardContent>
			</Card>
		</div>
	)
}
