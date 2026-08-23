import { ClockIcon, MailIcon, MapPinIcon, PhoneIcon } from "lucide-react"
import type { Metadata } from "next"
import { SHOWROOM } from "@/constants/catalog"
import { PageHeader } from "../_components/PageHeader"
import { ContactForm } from "./_components/ContactForm"

export const metadata: Metadata = {
	title: "Contact Us",
	description:
		"Call, email or walk into the showroom at 908 Old Thomasville Rd, High Point, North Carolina.",
	alternates: { canonical: "/contact" },
}

/**
 * The current site's contact page has a phone number, a gmail address and a
 * Facebook link — no form and no map. The only form anywhere on it is a popup
 * that covers the home page on load.
 *
 * LocalBusiness schema is here rather than in the layout because this is the
 * page that carries the full name, address and phone. It is the cheapest local
 * SEO available for a shop with a physical address, and the current site has
 * none of it.
 */
const jsonLd = {
	"@context": "https://schema.org",
	"@type": "HomeGoodsStore",
	name: "Overstock Discount Flooring",
	telephone: SHOWROOM.phone,
	address: {
		"@type": "PostalAddress",
		streetAddress: SHOWROOM.street,
		addressLocality: SHOWROOM.city,
		addressRegion: SHOWROOM.state,
		postalCode: SHOWROOM.zip,
		addressCountry: "US",
	},
	openingHoursSpecification: [
		{
			"@type": "OpeningHoursSpecification",
			dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
			opens: "08:00",
			closes: "17:00",
		},
		{
			"@type": "OpeningHoursSpecification",
			dayOfWeek: "Saturday",
			opens: "08:00",
			closes: "12:00",
		},
	],
}

const DETAILS = [
	{ Icon: MapPinIcon, label: "Showroom", lines: [SHOWROOM.street, `${SHOWROOM.city}, ${SHOWROOM.state} ${SHOWROOM.zip}`] },
	{ Icon: ClockIcon, label: "Open", lines: [SHOWROOM.weekdays, SHOWROOM.saturday] },
	{ Icon: PhoneIcon, label: "Phone", lines: [SHOWROOM.phone], href: SHOWROOM.phoneHref },
]

export default function ContactPage() {
	return (
		<>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
			/>

			<PageHeader
				trail={[{ href: "/", label: "Home" }, { label: "Contact" }]}
				light="Get in"
				bold="touch"
				intro="Call, send a message, or walk in. Somebody is on the floor every weekday."
			/>

			<section className="bg-paper">
				<div className="mx-auto grid max-w-[1280px] gap-14 px-5 pb-20 md:grid-cols-[1fr_1fr] md:pb-24">
					<div>
						<h2 className="display text-ink text-lg uppercase">Send a message</h2>
						<p className="text-muted-foreground mt-2 mb-8 text-sm">
							A name and one way to reach you is all we need.
						</p>
						<ContactForm />
					</div>

					<div className="bg-band p-8">
						<dl className="grid gap-8">
							{DETAILS.map(({ Icon, label, lines, href }) => (
								<div key={label} className="flex gap-4">
									<Icon className="text-muted-foreground mt-0.5 size-5 shrink-0" aria-hidden />
									<div>
										<dt className="display text-muted-foreground text-xs uppercase">
											{label}
										</dt>
										<dd className="mt-1.5 text-sm">
											{href ? (
												<a href={href}>{lines[0]}</a>
											) : (
												lines.map((line) => <div key={line}>{line}</div>)
											)}
										</dd>
									</div>
								</div>
							))}

							<div className="flex gap-4">
								<MailIcon className="text-muted-foreground mt-0.5 size-5 shrink-0" aria-hidden />
								<div>
									<dt className="display text-muted-foreground text-xs uppercase">
										Email
									</dt>
									{/* Deliberately not printing the gmail address the current site
									    uses. Order mail cannot be sent from it, and a mailbox on the
									    business domain is a launch requirement — the form is the
									    reliable route in the meantime. */}
									<dd className="text-muted-foreground mt-1.5 text-sm">
										Use the form and it reaches us.
									</dd>
								</div>
							</div>
						</dl>
					</div>
				</div>
			</section>
		</>
	)
}
