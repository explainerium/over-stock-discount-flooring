import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { LeadSource } from "@/generated/prisma/client"
import { requireStaff } from "@/server/auth/guards"
import { listLeads } from "@/server/repositories/leads"
import { LeadHandledToggle } from "./_components/LeadHandledToggle"

export const metadata = { title: "Leads" }

const SOURCE: Record<LeadSource, string> = {
	CONTACT_FORM: "Contact form",
	COVERAGE_CALCULATOR: "Calculator",
	SAMPLE_REQUEST: "Sample request",
	DEALER_APPLICATION: "Dealer application",
}

/**
 * One inbox for every public form.
 *
 * Until the client has a mailbox on his own domain and the DNS records to
 * authenticate it, nothing is emailed anywhere — so this page is not a
 * convenience, it is the only place a lead exists. Worth saying out loud
 * because a form that quietly drops enquiries is worse than no form.
 */
export default async function LeadsPage() {
	await requireStaff()
	const leads = await listLeads()

	const open = leads.filter((lead) => !lead.handledAt)
	const done = leads.filter((lead) => lead.handledAt)

	return (
		<div className="grid gap-6">
			<div>
				<h1 className="text-xl font-semibold tracking-wide uppercase">Leads</h1>
				<p className="text-muted-foreground text-sm">
					{open.length} waiting · {done.length} dealt with
				</p>
			</div>

			{leads.length === 0 ? (
				<Card>
					<CardContent className="text-muted-foreground py-10 text-center text-sm">
						Nothing yet. Enquiries from the contact form and dealer applications land
						here.
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-8">
					{[
						{ title: "Waiting", list: open },
						{ title: "Dealt with", list: done },
					]
						.filter((group) => group.list.length > 0)
						.map((group) => (
							<section key={group.title}>
								<h2 className="text-muted-foreground text-xs tracking-widest uppercase">
									{group.title}
								</h2>
								<ul className="mt-3 grid gap-2">
									{group.list.map((lead) => (
										<li
											key={lead.id}
											className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_auto]"
										>
											<div className="min-w-0">
												<div className="flex flex-wrap items-center gap-2">
													<p className="font-medium">
														{lead.name ?? "No name given"}
													</p>
													<Badge variant="outline">
														{SOURCE[lead.source]}
													</Badge>
													{lead.company && (
														<span className="text-muted-foreground text-sm">
															{lead.company}
														</span>
													)}
												</div>

												<p className="text-muted-foreground mt-1 text-sm">
													{lead.email && (
														<a href={`mailto:${lead.email}`}>
															{lead.email}
														</a>
													)}
													{lead.phone && (
														<>
															{lead.email && " · "}
															<a href={`tel:${lead.phone}`}>
																{lead.phone}
															</a>
														</>
													)}
												</p>

												{lead.message && (
													<p className="mt-3 text-sm whitespace-pre-wrap">
														{lead.message}
													</p>
												)}

												{/* A sample cannot be posted without this, so it gets its
											    own block rather than sitting inside the message. */}
												{lead.shipTo && (
													<div className="mt-3">
														<p className="text-muted-foreground text-xs tracking-widest uppercase">
															Post it to
														</p>
														<address className="mt-1 text-sm whitespace-pre-wrap not-italic">
															{lead.shipTo}
														</address>
													</div>
												)}

												{lead.product && (
													<p className="text-muted-foreground mt-2 text-xs">
														About{" "}
														<Link
															href={`/products/${lead.product.slug}`}
															className="underline underline-offset-4"
														>
															{lead.product.name}
														</Link>
													</p>
												)}

												<p className="text-muted-foreground mt-3 text-xs">
													{lead.createdAt.toLocaleString("en-US")}
												</p>
											</div>

											<div className="sm:self-start">
												<LeadHandledToggle
													id={lead.id}
													handled={Boolean(lead.handledAt)}
												/>
											</div>
										</li>
									))}
								</ul>
							</section>
						))}
				</div>
			)}
		</div>
	)
}
