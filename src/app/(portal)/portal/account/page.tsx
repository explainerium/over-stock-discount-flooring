import { AccountSettings } from "@/components/shared/AccountSettings"
import { requireDealerScope } from "@/server/auth/guards"

export const metadata = { title: "Your Account" }

/**
 * A dealer's own sign-in details.
 *
 * Same two forms the owner gets. Until this existed, a counter person who
 * wanted to change their password had one route — the forgot-password flow —
 * and that needs a mailbox the business does not have yet.
 */
export default async function AccountPage() {
	const { user } = await requireDealerScope()

	return (
		<div className="grid max-w-2xl gap-6">
			<div>
				<h1 className="text-xl font-semibold tracking-wide uppercase">Your Account</h1>
				<p className="text-muted-foreground text-sm">
					How you sign in. Your company&rsquo;s details are ours to change — call us.
				</p>
			</div>

			<AccountSettings email={user.email} />
		</div>
	)
}
