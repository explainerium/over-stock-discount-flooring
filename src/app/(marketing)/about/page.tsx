import type { Metadata } from "next"
import Link from "next/link"
import { SHOWROOM } from "@/constants/catalog"
import { PageHeader } from "../_components/PageHeader"

export const metadata: Metadata = {
	title: "About Us",
	description:
		"Family-owned in High Point, North Carolina. Our own made-in-USA luxury vinyl plank, more than two million square feet in stock, shipped coast to coast.",
	alternates: { canonical: "/about" },
}

/**
 * The client's approved About copy, word for word — `About_Us_Approved.txt` in
 * his November handover. Its opening line is the heading, the one-stop-shop
 * sentence is set as a list, and its closing line leads into the showroom
 * details. Edit the wording only with his say-so.
 *
 * Still open with him: the testimonials are from his current site and carry
 * initials only, which is a weak trust signal. Real Google reviews would do
 * more, and he has a Google Business Profile to pull them from.
 */
const RANGE = [
	"Luxury vinyl plank and tile",
	"Carpet",
	"Stair products",
	"Trim",
	"Accessories",
	"Butcher block countertops",
]

const TESTIMONIALS = [
	{
		initials: "AB",
		quote: "Thank you Nick, Steve, Will and Jerry for the beautiful flooring. Each of them is super responsive, professional, and you cannot beat the price for both materials and installation.",
	},
	{
		initials: "PT",
		quote: "Great selection, affordable prices, and they have everything you need — moisture barrier, matching transitions and quarter round. Steve and Ashley are amazing.",
	},
	{
		initials: "BB",
		quote: "Excellent customer service and a very customer-friendly environment. Great quality with an unbelievable selection of in-stock flooring to choose from.",
	},
]

export default function AboutPage() {
	return (
		<>
			<PageHeader
				trail={[{ href: "/", label: "Home" }, { label: "Company" }]}
				light="Flooring is our business."
				bold="Family is our foundation."
			/>

			<section className="bg-paper">
				<div className="mx-auto grid max-w-[1280px] gap-12 px-5 pb-20 md:grid-cols-2 md:pb-24">
					<div className="grid content-start gap-5 text-sm leading-relaxed">
						<p>
							Steve and Ashley started our family-owned business with a simple goal:
							offer quality flooring, fair prices, and the personal service customers
							deserve. Their son Nick joined the team in 2022, and we’ve never looked
							back.
						</p>
						<p>
							From our home in High Point, North Carolina, we’ve grown from one
							truckload of flooring to more than two million square feet in stock,
							shipping to customers from coast to coast every day.
						</p>
						<p>
							We manufacture our own private-label luxury vinyl plank flooring right
							here in the United States, with quality as our mission every step of the
							way—from the products we put our name on to the way we care for our
							customers.
						</p>
					</div>

					<div className="bg-band p-8">
						<h2 className="display text-ink text-lg uppercase">What we carry</h2>
						<p className="text-muted-foreground mt-3 text-sm">
							We’re your one-stop shop for flooring, offering:
						</p>
						<ul className="mt-5 grid gap-3 text-sm">
							{RANGE.map((item) => (
								<li key={item} className="border-rule border-t pt-3">
									{item}
								</li>
							))}
						</ul>
					</div>
				</div>
			</section>

			<section className="bg-band">
				<div className="mx-auto max-w-[1280px] px-5 py-20 md:py-24">
					<h2 className="display text-ink text-center text-2xl uppercase sm:text-3xl">
						<span className="font-light">What customers</span>{" "}
						<span className="font-bold">say</span>
					</h2>

					<div className="mt-12 grid gap-8 md:grid-cols-3">
						{TESTIMONIALS.map((item) => (
							<figure key={item.initials} className="bg-paper p-7">
								<blockquote className="text-sm leading-relaxed">
									&ldquo;{item.quote}&rdquo;
								</blockquote>
								<figcaption className="display text-muted-foreground mt-5 text-xs uppercase">
									{item.initials}
								</figcaption>
							</figure>
						))}
					</div>
				</div>
			</section>

			<section className="bg-paper">
				<div className="mx-auto max-w-[1280px] px-5 py-20 text-center md:py-24">
					<h2 className="display text-ink text-2xl uppercase sm:text-3xl">
						<span className="font-light">Part of</span>{" "}
						<span className="font-bold">the family</span>
					</h2>
					<p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed">
						Whether you need one box of flooring or enough for an entire neighborhood,
						you’re part of the family now, too.
					</p>
					<p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm">
						Open to the public at {SHOWROOM.street}, {SHOWROOM.city}, {SHOWROOM.state}{" "}
						{SHOWROOM.zip}. {SHOWROOM.weekdays} and {SHOWROOM.saturday}.
					</p>
					<div className="mt-10 flex flex-wrap justify-center gap-3">
						<Link href="/contact" className="btn bg-ink text-paper">
							Get in touch
						</Link>
						<Link href="/products" className="btn border-rule text-ink border">
							See the catalog
						</Link>
					</div>
				</div>
			</section>
		</>
	)
}
