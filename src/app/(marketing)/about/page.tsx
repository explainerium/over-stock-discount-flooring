import type { Metadata } from "next"
import Link from "next/link"
import { SHOWROOM } from "@/constants/catalog"
import { PageHeader } from "../_components/PageHeader"

export const metadata: Metadata = {
	title: "About Us",
	description:
		"A family-owned flooring business in High Point, North Carolina. Factory direct rigid core LVP, sold to the public and to the trade.",
	alternates: { canonical: "/about" },
}

/**
 * The client's own About copy, lightly corrected.
 *
 * Two things to raise with him before this goes live:
 *
 *   1. "nearly a decade in business" was written around 2024 and needs
 *      re-dating, or replacing with a founding year that will not go stale.
 *   2. The testimonials on the current site are initials only — CT, BB, AB —
 *      which is a weak trust signal. Real Google reviews would do more, and he
 *      has a Google Business Profile to pull them from.
 *
 * The quotes below are his, kept because they say something specific. The
 * staff names in them are the closest thing the site has to a team page.
 */
const TESTIMONIALS = [
	{
		initials: "AB",
		quote:
			"Thank you Nick, Steve, Will and Jerry for the beautiful flooring. Each of them is super responsive, professional, and you cannot beat the price for both materials and installation.",
	},
	{
		initials: "PT",
		quote:
			"Great selection, affordable prices, and they have everything you need — moisture barrier, matching transitions and quarter round. Steve and Ashley are amazing.",
	},
	{
		initials: "BB",
		quote:
			"Excellent customer service and a very customer-friendly environment. Great quality with an unbelievable selection of in-stock flooring to choose from.",
	},
]

export default function AboutPage() {
	return (
		<>
			<PageHeader
				trail={[{ href: "/", label: "Home" }, { label: "Company" }]}
				light="Pursuit of excellence"
				bold="is in our genes"
				intro="A family-owned company that has served thousands of customers in High Point, North Carolina."
			/>

			<section className="bg-paper">
				<div className="mx-auto grid max-w-[1280px] gap-12 px-5 pb-20 md:grid-cols-2 md:pb-24">
					<div className="grid gap-5 text-sm leading-relaxed">
						<p>
							We have been helping residential and commercial customers for years with
							everyday low prices, flooring consultations and professional installation
							referrals.
						</p>
						<p>
							We partner directly with the manufacturer and serve as a factory direct
							outlet. That lets us skip the middle man and supply good flooring at
							wholesale prices — which is the whole reason the business exists.
						</p>
						<p>
							We are proud to carry the area&rsquo;s most extensive range of made-in-the-USA
							rigid core luxury vinyl flooring, in stock and available. Come and see it.
						</p>
					</div>

					<div className="bg-band p-8">
						<h2 className="display text-ink text-lg uppercase">What we do</h2>
						<ul className="mt-5 grid gap-3 text-sm">
							{[
								"Detailed product information and free estimates",
								"Visualiser boards to see a floor before you buy it",
								"Installation referrals",
								"Delivery options across the region",
								"Wholesale pricing for trade accounts",
							].map((item) => (
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
						<span className="font-light">Open to the</span>{" "}
						<span className="font-bold">public</span>
					</h2>
					<p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm">
						{SHOWROOM.street}, {SHOWROOM.city}, {SHOWROOM.state} {SHOWROOM.zip}.{" "}
						{SHOWROOM.weekdays} and {SHOWROOM.saturday}.
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
