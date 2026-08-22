import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireStaff } from "@/server/auth/guards"
import { getSeries } from "@/server/repositories/catalog"
import { EditSeriesForm } from "./_components/EditSeriesForm"

export default async function EditSeriesPage({ params }: { params: Promise<{ id: string }> }) {
	await requireStaff()
	const { id } = await params

	const series = await getSeries(id)
	if (!series) notFound()

	const certifications = series.facts.filter((fact) => fact.kind === "CERTIFICATION")
	const tests = series.facts.filter((fact) => fact.kind === "TEST_RESULT")

	return (
		<div className="grid max-w-3xl gap-4">
			<Link
				href="/admin/series"
				className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
			>
				<ArrowLeftIcon className="size-4" aria-hidden />
				Series
			</Link>

			<Card>
				<CardHeader>
					<CardTitle>{series.name}</CardTitle>
				</CardHeader>
				<CardContent>
					<EditSeriesForm
						productCount={series._count.products}
						defaults={{
							id: series.id,
							name: series.name,
							blurb: series.blurb ?? "",
							lengthIn: series.lengthIn?.toString() ?? "",
							widthIn: series.widthIn?.toString() ?? "",
							thicknessMm: series.thicknessMm?.toString() ?? "",
							wearLayerMil: series.wearLayerMil?.toString() ?? "",
							finishing: series.finishing ?? "",
							edgeProfile: series.edgeProfile ?? "",
							sqFtPerBox: series.sqFtPerBox?.toString() ?? "",
							boxesPerPallet: series.boxesPerPallet?.toString() ?? "",
							lbPerBox: series.lbPerBox?.toString() ?? "",
							lbPerPallet: series.lbPerPallet?.toString() ?? "",
							palletsPerFtl: series.palletsPerFtl?.toString() ?? "",
							freightClass: series.freightClass ?? "",
							nmfcCode: series.nmfcCode ?? "",
							isActive: series.isActive,
						}}
					/>
				</CardContent>
			</Card>

			{/* Read-only for now. These came off the client's own spec sheets and
			    nobody has asked to edit them; a CRUD screen for something never
			    edited is surface with no purpose. */}
			{series.facts.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Certifications and test results</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-5 text-sm">
						<div className="flex flex-wrap gap-2">
							{certifications.map((fact) => (
								<Badge key={fact.id} variant="secondary">
									{fact.label}
								</Badge>
							))}
						</div>
						<dl className="grid gap-y-1.5 sm:grid-cols-[17rem_1fr]">
							{tests.map((fact) => (
								<div key={fact.id} className="contents">
									<dt className="text-muted-foreground">
										{fact.label}
										{fact.standard && (
											<span className="ml-1 font-mono text-xs">
												{fact.standard}
											</span>
										)}
									</dt>
									<dd>{fact.result}</dd>
								</div>
							))}
						</dl>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
