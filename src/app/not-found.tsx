import Link from "next/link"

/**
 * A 404 that belongs to the site.
 *
 * The current ODF site returns Apache's bare "404 Not Found" — thirteen bytes,
 * no branding, no way back. It was one of the specific shortcomings the audit
 * recorded, and it matters more than usual here: the rebuild changes every URL
 * on the site, so some share of visitors will arrive on this page from an old
 * link or an old search result. It should give them somewhere to go.
 */
export default function NotFound() {
	return (
		<div className="bg-ink text-paper flex min-h-svh flex-col items-center justify-center px-5 py-24 text-center">
			<p className="display text-xs tracking-[0.25em] uppercase opacity-60">Error 404</p>

			<h1 className="display mt-6 text-4xl uppercase sm:text-5xl">
				<span className="font-light">We could not</span>
				<br />
				<span className="font-bold">find that page</span>
			</h1>

			<p className="mt-6 max-w-md text-sm opacity-80">
				It may have moved, or the link may be out of date. The catalog is the best place to
				start.
			</p>

			<div className="mt-10 flex flex-wrap justify-center gap-3">
				<Link href="/products" className="btn bg-paper text-ink">
					Browse the catalog
				</Link>
				<Link href="/" className="btn border border-white/40">
					Home
				</Link>
			</div>
		</div>
	)
}
