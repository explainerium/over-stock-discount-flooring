import type { Metadata } from "next"
import Link from "next/link"
import { PageHeader } from "../_components/PageHeader"
import { DealerApplicationForm } from "./_components/DealerApplicationForm"

export const metadata: Metadata = {
	title: "Apply for a Dealer / Contractor Account",
	description:
		"Trade accounts with your own pricing, ordering by the box, pallet or square foot, and orders submitted online instead of by phone.",
	alternates: { canonical: "/become-a-dealer" },
}

/**
 * The acquisition path.
 *
 * The client wants to go from about ten dealers to fifty or a hundred, but
 * accounts are invite-only and there was no way for anyone to ask for one. This
 * page is the funnel that feeds the invite flow — an application creates a lead,
 * the owner reads it, and he sends an invite if he wants to. Nobody
 * self-registers.
 */
const BENEFITS = [
	{
		title: "Your own pricing",
		body: "Set per account. Signed in, you see your prices — nobody else does.",
	},
	{
		title: "Order the way you buy",
		body: "By the square foot, the box or the pallet. Type a square footage and we round it to whole boxes for you.",
	},
	{
		title: "No more quote calls",
		body: "Build the order, send it, and we approve it. You stop waiting on the phone for a number.",
	},
	{
		title: "Invoiced through QuickBooks",
		body: "Nothing is paid online. We approve the order and the invoice comes through as usual.",
	},
]

export default function BecomeADealerPage() {
	return (
		<>
			<PageHeader
				trail={[{ href: "/", label: "Home" }, { label: "Dealer / Contractor Accounts" }]}
				light="Dealer / Contractor"
				bold="accounts"
				intro="Trade accounts are set up by invitation. Tell us about your business and we will get back to you."
			/>

			<section className="bg-paper">
				<div className="mx-auto grid max-w-[1280px] gap-14 px-5 pb-20 md:grid-cols-[1fr_1fr] md:pb-24">
					<div>
						<dl className="grid gap-8">
							{BENEFITS.map((benefit) => (
								<div key={benefit.title} className="border-rule border-t pt-5">
									<dt className="display text-ink text-base">{benefit.title}</dt>
									<dd className="text-muted-foreground mt-2 text-sm leading-relaxed">
										{benefit.body}
									</dd>
								</div>
							))}
						</dl>

						<p className="text-muted-foreground mt-10 text-sm">
							Already have an account?{" "}
							<Link href="/login" className="text-ink underline underline-offset-4">
								Sign in
							</Link>
							.
						</p>
					</div>

					<div className="bg-band p-8">
						<h2 className="display text-ink text-lg uppercase">Apply</h2>
						<p className="text-muted-foreground mt-2 mb-8 text-sm">
							This is not an account yet — it comes to us and we get in touch.
						</p>
						<DealerApplicationForm />
					</div>
				</div>
			</section>
		</>
	)
}
