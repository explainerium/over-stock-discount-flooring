import type { Metadata } from "next"
import Link from "next/link"
import { SHOWROOM } from "@/constants/catalog"
import { PageHeader } from "../_components/PageHeader"

export const metadata: Metadata = {
	title: "About Us",
	description:
		"Family-owned in High Point, North Carolina, with over 2 million square feet of flooring in stock, our own private-label LVP and nationwide shipping.",
	alternates: { canonical: "/about" },
}

/**
 * The client's About copy, word for word — the "About Us Page" section of his
 * 19 November revision list, which replaced the shorter approved text from the
 * handover. His headings are the section headings. Edit the wording only with
 * his say-so.
 *
 * Photos are coming from him: one main picture and some smaller ones. The
 * opening section is one column until then so there is no empty frame.
 *
 * Reviews: none may name Will or Jerry — they have left the company under
 * separation agreements (client, 19 November). The review that thanked them
 * was swapped for SH's, from the same page of his current site.
 */
const TESTIMONIALS = [
	{
		initials: "SH",
		quote: "The absolute best prices, customer service and quality products. Steve & his team are the very best at providing customers with the best experience possible. 10/10 recommend!",
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
				light="Flooring Is Our Business."
				bold="Family Is Our Foundation."
			/>

			<section className="bg-paper">
				<div className="mx-auto max-w-[1280px] px-5 pb-20 md:pb-24">
					<div className="grid max-w-3xl gap-5 text-base leading-relaxed">
						<p>
							At Overstock Discount Flooring, family is at the heart of everything we
							do. Steve and Ashley started our family-owned business in High Point,
							North Carolina, with a simple goal: provide quality flooring at
							affordable prices while treating every customer like family. Their son
							Nick joined the business in 2022, helping continue that same commitment
							to honest service, great products, and unbeatable value.
						</p>
						<p>
							What began with a single truckload of flooring has grown into one of the
							largest suppliers of luxury vinyl plank (LVP) flooring in North
							Carolina, with{" "}
							<strong>over 2 million square feet of flooring in stock</strong>. While
							our business has grown tremendously, our values haven’t changed. We
							still believe every homeowner deserves beautiful, durable flooring
							without having to spend a fortune.
						</p>
					</div>
				</div>
			</section>

			<section className="bg-band">
				<div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-20 md:grid-cols-[1fr_1.4fr] md:py-24">
					<h2 className="display text-ink text-2xl uppercase sm:text-3xl">
						<span className="font-light">Pursuit of Excellence</span>{" "}
						<span className="font-bold">Is in Our Genes</span>
					</h2>
					<div className="grid gap-5 text-sm leading-relaxed">
						<p>
							We understand that choosing new flooring is an important part of making
							your house feel like home. Whether you’re renovating a single room,
							remodeling your entire home, or building something new, our team is here
							to help you every step of the way.
						</p>
						<p>
							We take pride in offering a wide selection of flooring styles, colors,
							and products to fit different tastes and budgets. By manufacturing our
							own private-label luxury vinyl plank flooring and working directly with
							manufacturers, we’re able to provide exceptional value without
							sacrificing quality.
						</p>
						<p>
							More importantly, we believe in personal service. When you visit our
							showroom, you’ll find real people who care about your project, take the
							time to answer your questions, and help you find flooring you’ll love
							for years to come.
						</p>
					</div>
				</div>
			</section>

			<section className="bg-paper">
				<div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-20 md:grid-cols-[1fr_1.4fr] md:py-24">
					<h2 className="display text-ink text-2xl uppercase sm:text-3xl">
						<span className="font-light">More Than Just a</span>{" "}
						<span className="font-bold">Flooring Store</span>
					</h2>
					<div className="grid gap-5 text-sm leading-relaxed">
						<p>
							From luxury vinyl plank and tile to carpet, stair products, trim,
							accessories, and butcher block countertops, we strive to be your
							one-stop shop for flooring and home improvement materials.
						</p>
						<p>
							We’re proud to serve homeowners throughout North Carolina, along with
							contractors and dealers across the country. Nationwide shipping is
							available, but our roots and our commitment to personal service will
							always remain right here in High Point.
						</p>
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
						<span className="font-light">Come See the</span>{" "}
						<span className="font-bold">Difference</span>
					</h2>
					<p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed">
						Whether you’re shopping for one room or an entire home, we invite you to
						stop by, meet our family, and see why so many customers trust Overstock
						Discount Flooring.
					</p>
					<address className="text-muted-foreground mx-auto mt-6 max-w-xl text-sm leading-relaxed not-italic">
						{SHOWROOM.street}, {SHOWROOM.city}, {SHOWROOM.state} {SHOWROOM.zip}
						<br />
						Monday–Friday: 8 AM–5 PM · Saturday: 8 AM–12 PM · Sunday: Closed
					</address>
					<div className="mt-10 flex flex-wrap justify-center gap-3">
						<Link href="/contact" className="btn bg-ink text-paper">
							Get in touch
						</Link>
						<Link href="/products" className="btn border-rule text-ink border">
							See the catalog
						</Link>
					</div>
					<p className="display text-ink mt-14 text-lg font-bold uppercase">
						Quality Floors. Discount Prices.
					</p>
				</div>
			</section>
		</>
	)
}
