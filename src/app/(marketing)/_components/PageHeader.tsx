import { Breadcrumbs, type Crumb } from "./Breadcrumbs"

/**
 * The top of every inner page: breadcrumb, then a heading that sets one light
 * word against one bold one — the reference site's device, and the thing that
 * makes its pages read as a set.
 */
export function PageHeader({
	trail,
	light,
	bold,
	intro,
}: {
	trail: Crumb[]
	light: string
	bold: string
	intro?: string
}) {
	return (
		<section className="bg-paper">
			<div className="mx-auto max-w-[1280px] px-5 pt-8 pb-10">
				<Breadcrumbs trail={trail} />
				<h1 className="display text-ink mt-6 text-3xl uppercase sm:text-4xl">
					<span className="font-light">{light}</span>{" "}
					<span className="font-bold">{bold}</span>
				</h1>
				{intro && <p className="text-muted-foreground mt-4 max-w-2xl text-sm">{intro}</p>}
			</div>
		</section>
	)
}
