import { DownloadIcon } from "lucide-react"
import type { Metadata } from "next"
import { listPublicSeries } from "@/server/repositories/catalog"
import { db } from "@/server/db/client"
import { PageHeader } from "../_components/PageHeader"
import { CoverageCalculator } from "../_components/CoverageCalculator"

export const metadata: Metadata = {
	title: "Resources",
	description:
		"Warranties, installation guides and a coverage calculator for rigid core luxury vinyl plank.",
	alternates: { canonical: "/resources" },
}

export const revalidate = 3600

/**
 * One place for the documents.
 *
 * On the current site the warranty and installation PDFs sit loose under
 * /upload/prod/… with nothing linking to them but the product pages, so nobody
 * finds them unless they already know the colour they want.
 */
export default async function ResourcesPage() {
	const series = await listPublicSeries()

	const withDocs = await db.series.findMany({
		where: {
			isActive: true,
			OR: [{ warrantyPdfUrl: { not: null } }, { installationPdfUrl: { not: null } }],
		},
		select: { id: true, name: true, warrantyPdfUrl: true, installationPdfUrl: true },
		orderBy: { sortOrder: "asc" },
	})

	const calculatorSeries = series
		.filter((s) => s.sqFtPerBox && s.boxesPerPallet)
		.map((s) => ({
			slug: s.slug,
			name: s.name,
			sqFtPerBox: s.sqFtPerBox!.toString(),
			boxesPerPallet: s.boxesPerPallet!,
		}))

	return (
		<>
			<PageHeader
				trail={[{ href: "/", label: "Home" }, { label: "Resources" }]}
				light="Guides and"
				bold="downloads"
				intro="Everything you need before and after the floor arrives."
			/>

			<section id="coverage-calculator" className="anchor-target bg-band">
				<div className="mx-auto grid max-w-[1280px] gap-12 px-5 py-20 lg:grid-cols-[1fr_24rem] lg:items-center">
					<div>
						<h2 className="display text-ink text-2xl uppercase sm:text-3xl">
							<span className="font-light">Coverage</span>{" "}
							<span className="font-bold">calculator</span>
						</h2>
						<p className="text-muted-foreground mt-4 max-w-lg text-sm leading-relaxed">
							Flooring ships by the box, so the answer is never quite the number you
							measured. Enter your square footage, pick a series, and we round up to
							whole boxes and show what they actually cover.
						</p>
					</div>
					<CoverageCalculator series={calculatorSeries} />
				</div>
			</section>

			<section className="bg-paper">
				<div className="mx-auto max-w-[1280px] px-5 py-20 md:py-24">
					<h2 className="display text-ink text-2xl uppercase sm:text-3xl">
						<span className="font-light">Warranties and</span>{" "}
						<span className="font-bold">installation</span>
					</h2>

					<ul className="mt-10 grid gap-3">
						{withDocs.map((item) => (
							<li
								key={item.id}
								className="border-rule flex flex-wrap items-center justify-between gap-4 border-b py-4"
							>
								<span className="display text-ink text-sm">{item.name}</span>
								{/* -my-1.5 against py-1.5 on each link: a 16px download
								    link is the whole point of this page, and the row keeps
								    its height. */}
								<span className="-my-1.5 flex flex-wrap gap-6">
									{item.installationPdfUrl && (
										<a
											href={item.installationPdfUrl}
											className="display text-ink flex items-center gap-2 py-1.5 text-xs uppercase underline underline-offset-4"
										>
											<DownloadIcon className="size-4" aria-hidden />
											Installation
										</a>
									)}
									{item.warrantyPdfUrl && (
										<a
											href={item.warrantyPdfUrl}
											className="display text-ink flex items-center gap-2 py-1.5 text-xs uppercase underline underline-offset-4"
										>
											<DownloadIcon className="size-4" aria-hidden />
											Warranty
										</a>
									)}
								</span>
							</li>
						))}
					</ul>
				</div>
			</section>
		</>
	)
}
