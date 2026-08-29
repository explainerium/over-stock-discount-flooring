import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireStaff } from "@/server/auth/guards"
import { getOrderMailCc } from "@/server/repositories/settings"
import { isConfigured } from "@/server/integrations/quickbooks"
import { getItemRefs, qboStatus } from "@/server/repositories/quickbooks"
import { AccountSettings } from "@/components/shared/AccountSettings"
import { OrderMailCcForm } from "./_components/OrderMailCcForm"
import { QuickBooksPanel } from "./_components/QuickBooksPanel"

export const metadata = { title: "Settings" }

/**
 * The things the owner should be able to change without ringing us.
 *
 * Only what a person would reasonably want to change on a Tuesday. Secrets and
 * connection strings stay in the environment, where a mistake is a deploy away
 * from being caught rather than live immediately.
 */
export default async function SettingsPage({
	searchParams,
}: {
	searchParams: Promise<{ qbo?: string }>
}) {
	// The QuickBooks callback is a redirect, not a form post, so what happened
	// comes back in the URL. Shown once, at the top, in the owner's words rather
	// than Intuit's.
	const { qbo } = await searchParams
	const user = await requireStaff()
	const [cc, status, items] = await Promise.all([getOrderMailCc(), qboStatus(), getItemRefs()])

	return (
		<div className="grid max-w-2xl gap-6">
			<div>
				<h1 className="text-xl font-semibold tracking-wide uppercase">Settings</h1>
				<p className="text-muted-foreground text-sm">
					Changes here take effect immediately.
				</p>
			</div>

			{qbo && (
				<Alert>
					<AlertDescription>{qbo}</AlertDescription>
				</Alert>
			)}

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

			<Card>
				<CardHeader>
					<CardTitle className="text-base">QuickBooks</CardTitle>
					<CardDescription>
						An approved order raises an invoice in your books. Nothing is charged here —
						payment runs through QuickBooks exactly as it does now.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<QuickBooksPanel
						status={status}
						configured={isConfigured()}
						items={{
							goodsItemId: items?.goodsItemId ?? "",
							freightItemId: items?.freightItemId ?? "",
						}}
					/>
				</CardContent>
			</Card>
		</div>
	)
}
