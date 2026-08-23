import { MapPinIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { db } from "@/server/db/client"
import { PageHeader } from "../_components/PageHeader"

export const metadata: Metadata = {
	title: "Find a Dealer",
	description:
		"Flooring businesses stocking Overstock Discount Flooring rigid core LVP across the region.",
	alternates: { canonical: "/dealers" },
}

export const revalidate = 3600

/**
 * The dealer locator.
 *
 * Two jobs, both worth having. It gives the public site something to do beyond
 * browsing, and it gives a dealer a concrete reason to want an account — being
 * listed means the manufacturer sends work their way. As the network grows from
 * ten to a hundred, that becomes a retention tool rather than a directory.
 *
 * Active dealers only, and only what they would want shown: company, town and
 * state. No contact details, no addresses — those belong to them, and publishing
 * a shipping address because it happens to be in the database would be careless.
 */
export default async function DealersPage() {
	const dealers = await db.dealer.findMany({
		where: { status: "ACTIVE" },
		select: {
			id: true,
			companyName: true,
			addresses: {
				where: { isDefault: true },
				select: { city: true, state: true },
				take: 1,
			},
		},
		orderBy: { companyName: "asc" },
	})

	const byState = new Map<string, typeof dealers>()
	for (const dealer of dealers) {
		const state = dealer.addresses[0]?.state ?? "Other"
		byState.set(state, [...(byState.get(state) ?? []), dealer])
	}

	return (
		<>
			<PageHeader
				trail={[{ href: "/", label: "Home" }, { label: "Find a Dealer" }]}
				light="Find a"
				bold="dealer"
				intro="Flooring businesses stocking our rigid core LVP. If you are one of them and you are not listed, get in touch."
			/>

			<section className="bg-paper">
				<div className="mx-auto max-w-[1280px] px-5 pb-20 md:pb-24">
					{dealers.length === 0 ? (
						<div className="bg-band px-8 py-16 text-center">
							<MapPinIcon className="text-muted-foreground mx-auto size-8" aria-hidden />
							<p className="display text-ink mt-5 text-lg uppercase">
								No dealers listed yet
							</p>
							<p className="text-muted-foreground mx-auto mt-3 max-w-md text-sm">
								We are setting up trade accounts now. In the meantime the showroom in
								High Point is open to everyone.
							</p>
							<div className="mt-8 flex flex-wrap justify-center gap-3">
								<Link href="/become-a-dealer" className="btn bg-ink text-paper">
									Become a dealer
								</Link>
								<Link href="/contact" className="btn border-rule text-ink border">
									Contact us
								</Link>
							</div>
						</div>
					) : (
						<div className="grid gap-12">
							{[...byState.entries()].sort().map(([state, list]) => (
								<div key={state}>
									<h2 className="display text-ink border-rule border-b pb-3 text-sm uppercase">
										{state}
									</h2>
									<ul className="mt-6 grid gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
										{list.map((dealer) => (
											<li key={dealer.id} className="border-rule border-b pb-3">
												<p className="text-sm font-medium">{dealer.companyName}</p>
												{dealer.addresses[0] && (
													<p className="text-muted-foreground text-xs">
														{dealer.addresses[0].city}, {dealer.addresses[0].state}
													</p>
												)}
											</li>
										))}
									</ul>
								</div>
							))}
						</div>
					)}
				</div>
			</section>
		</>
	)
}
