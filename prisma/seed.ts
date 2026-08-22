import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"

/**
 * Seed — the real catalogue, not sample data.
 *
 * Every number here was read off the live site and cross-checked against
 * itself: boxes × sq ft/box matches the published sq ft/pallet for all five
 * series, boxes × lb/box plus a pallet's own weight matches lb/pallet, and
 * pallets × lb/pallet lands just under the ~44,000 lb truckload cap in every
 * case. The full working is in the project's content-inventory.md.
 *
 * Building against this rather than placeholder data is deliberate. The hidden
 * "W" series — same colour names, different sq ft/box and boxes/pallet — is
 * exactly the sort of thing invented data hides until it is expensive.
 */

const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }),
})

/**
 * Five spec groups, not three.
 *
 * `isPublicSeries` marks the two whose pages are live but commented out of the
 * client's own navigation. Until he says whether they are discontinued,
 * current or dealer-only, their products are seeded inactive — present, so
 * nothing has to be re-entered, invisible, so nothing wrong is published.
 */
const SERIES = [
	{
		name: "Bronze Series",
		slug: "bronze",
		widthIn: "7.17",
		thicknessMm: "5",
		wearLayerMil: 12,
		finishing: "Random EIR",
		sqFtPerBox: "28.68",
		boxesPerPallet: 55,
		lbPerBox: "49.4",
		lbPerPallet: "2745",
		palletsPerFtl: 16,
		legacyPath: "bronze",
		active: true,
		sortOrder: 1,
		colors: ["Avalon", "Golden Coast", "Harmony", "Laurel Springs", "Redwood Falls", "Timber Lake"],
	},
	{
		name: "Silver Series",
		slug: "silver",
		widthIn: "7.09",
		thicknessMm: "5",
		wearLayerMil: 12,
		finishing: "Wood Emboss",
		sqFtPerBox: "23.64",
		boxesPerPallet: 55,
		lbPerBox: "40.0",
		lbPerPallet: "2230",
		palletsPerFtl: 19,
		legacyPath: "silver-a",
		active: true,
		sortOrder: 2,
		colors: [
			"Berkley Oak SE",
			"Cumberland Lite",
			"Lighthouse Bay",
			"Mill Creek",
			"Smokey Creek",
			"Sterling Oak",
			"Twilight",
		],
	},
	{
		// Wider plank and a thinner core than standard Silver, and it packs 60
		// to a pallet where everything else packs 55.
		name: "Silver Series W",
		slug: "silver-w",
		widthIn: "7.17",
		thicknessMm: "4.5",
		wearLayerMil: 12,
		finishing: "Wood Emboss",
		sqFtPerBox: "28.68",
		boxesPerPallet: 60,
		lbPerBox: "44.5",
		lbPerPallet: "2700",
		palletsPerFtl: 16,
		legacyPath: "silver-w",
		active: false,
		sortOrder: 3,
		colors: [
			"Berkley Oak SE",
			"Cumberland Lite",
			"Lighthouse Bay",
			"Mill Creek",
			"Smokey Creek",
			"Sterling Oak",
			"Twilight",
		],
	},
	{
		name: "Gold Series",
		slug: "gold",
		widthIn: "7.09",
		thicknessMm: "5",
		wearLayerMil: 20,
		finishing: "Wood Emboss",
		sqFtPerBox: "23.64",
		boxesPerPallet: 55,
		lbPerBox: "40.0",
		lbPerPallet: "2230",
		palletsPerFtl: 19,
		legacyPath: "gold-a",
		active: true,
		sortOrder: 4,
		colors: [
			"Brookfield", "Charleston", "Classic Lodge", "Everstill Forest", "Fountain Hills",
			"Golden Pine", "Houston", "Kaneohe Bay", "Lake Lanier", "Mesa", "Natural Oak",
			"Nightfall Hills", "Northshire", "Olympia", "Petrified Forest", "Phoenix",
			"Placid Cabin", "Providence", "River View", "Rock Creek", "Vintage Cabin",
		],
	},
	{
		name: "Gold Series W",
		slug: "gold-w",
		widthIn: "7.17",
		thicknessMm: "5",
		wearLayerMil: 20,
		finishing: "Wood Emboss",
		sqFtPerBox: "23.90",
		boxesPerPallet: 55,
		lbPerBox: "40.5",
		lbPerPallet: "2258",
		palletsPerFtl: 19,
		legacyPath: "gold-w",
		active: false,
		sortOrder: 5,
		colors: [
			"Brookfield", "Charleston", "Classic Lodge", "Everstill Forest", "Fountain Hills",
			"Golden Pine", "Houston", "Kaneohe Bay", "Lake Lanier", "Mesa", "Natural Oak",
			"Nightfall Hills", "Northshire", "Olympia", "Petrified Forest", "Phoenix",
			"Placid Cabin", "Providence", "River View", "Rock Creek", "Vintage Cabin",
		],
	},
] as const

/** Shared by every series — the certifications printed on all five spec sheets. */
const CERTIFICATIONS = [
	{ label: "FloorScore", standard: "SCS-EC10.3-2014v3.0", requirement: "Refer to Standards", result: "Pass" },
	{ label: "Greenguard Gold", standard: "CDPH Standard Method V1.2-2017", requirement: "Refer to Standards", result: "Pass" },
	{ label: "CE Certification", standard: "EN14041", requirement: "Refer to Standards", result: "Pass" },
	{ label: "Fire resistance", standard: "EN 13501-1", requirement: "Refer to Standards", result: "Pass" },
]

const TEST_RESULTS = [
	{ label: "Static Coefficient of Friction", standard: "ASTM C1028", result: "Dry 0.69 / Wet 0.56" },
	{ label: "Peel Strength of Adhesive Bonds", standard: "ASTM D903", requirement: "≥5.5 lbs/inch", result: "10.3 lbs/inch" },
	{ label: "Abrasion Resistance", standard: "ASTM D4060", result: "14,000 cycles" },
	{ label: "Critical Radiant Flux", standard: "ASTM E648", result: "Exceeds Class 1" },
	{ label: "Resistance to Chemicals", standard: "ASTM F925", result: "0 — No change" },
	{ label: "Heavy Metal Content", standard: "ASTM F963", result: "Not detected" },
	{ label: "Static Load Limit", standard: "ASTM F970", result: "0.003 inch" },
	{ label: "Heat Stability", standard: "ASTM F1514", result: "Gray Scale 5 — no change" },
	{ label: "Light Stability", standard: "ASTM F1515", result: "Gray Scale 5 — no change" },
	{ label: "Residual Indentation", standard: "ASTM F1914 / F3261", result: "0.002 inch" },
]

/**
 * Accessories — the counterexample to "price is always per square foot".
 *
 * Prices are the ones publicly listed on the current site. Whether they stay
 * public once flooring prices go behind the dealer login is an open question,
 * so `isPublic` follows today's behaviour rather than guessing.
 *
 * No stick length is published, so none is invented here: the UOM engine keeps
 * linear feet continuous until the client says how these are bundled.
 */
const ACCESSORIES = [
	{ name: '5-¼" Primed White Pine Baseboard', slug: "baseboard-5-25", sku: "ACC-BB-525", listPrice: "1.09" },
	{ name: '3-¼" Primed White Pine Baseboard', slug: "baseboard-3-25", sku: "ACC-BB-325", listPrice: "0.69" },
	{ name: '11/16" × 11/16" Primed White Pine Quarter Round', slug: "quarter-round", sku: "ACC-QR-1116", listPrice: "0.41" },
]

const slugify = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")

/** Provisional. The current catalogue shows no SKUs at all and the client has
 *  not confirmed a scheme — see the open questions in the project plan. */
const skuFor = (seriesSlug: string, color: string) =>
	`${seriesSlug.toUpperCase().replace(/-/g, "")}-${slugify(color).toUpperCase().replace(/-/g, "").slice(0, 10)}`

async function main() {
	console.log("Seeding catalogue…")

	// --- Accessories live under their own series so the spec fields stay null.
	const accessorySeries = await prisma.series.upsert({
		where: { slug: "accessories" },
		update: {},
		create: {
			name: "Accessories",
			slug: "accessories",
			blurb: "Trim and mouldings, priced per linear foot.",
			sortOrder: 90,
		},
	})

	for (const [index, item] of ACCESSORIES.entries()) {
		await prisma.product.upsert({
			where: { slug: item.slug },
			update: {},
			create: {
				name: item.name,
				slug: item.slug,
				sku: item.sku,
				seriesId: accessorySeries.id,
				pricingUom: "LF",
				orderUoms: ["LF"],
				listPrice: item.listPrice,
				isPublic: true,
				isActive: true,
				sortOrder: index,
			},
		})
	}
	console.log(`  accessories: ${ACCESSORIES.length}`)

	// --- Flooring.
	let productCount = 0

	for (const series of SERIES) {
		const record = await prisma.series.upsert({
			where: { slug: series.slug },
			update: {},
			create: {
				name: series.name,
				slug: series.slug,
				lengthIn: "48.03",
				widthIn: series.widthIn,
				thicknessMm: series.thicknessMm,
				wearLayerMil: series.wearLayerMil,
				finishing: series.finishing,
				edgeProfile: "Micro Bevel",
				sqFtPerBox: series.sqFtPerBox,
				boxesPerPallet: series.boxesPerPallet,
				lbPerBox: series.lbPerBox,
				lbPerPallet: series.lbPerPallet,
				palletsPerFtl: series.palletsPerFtl,
				warrantyPdfUrl: `/docs/${series.legacyPath}/warranty.pdf`,
				installationPdfUrl: `/docs/${series.legacyPath}/installation.pdf`,
				isActive: series.active,
				sortOrder: series.sortOrder,
			},
		})

		const existingFacts = await prisma.seriesFact.count({ where: { seriesId: record.id } })
		if (existingFacts === 0) {
			await prisma.seriesFact.createMany({
				data: [
					...CERTIFICATIONS.map((fact, i) => ({
						...fact,
						seriesId: record.id,
						kind: "CERTIFICATION" as const,
						sortOrder: i,
					})),
					...TEST_RESULTS.map((fact, i) => ({
						...fact,
						seriesId: record.id,
						kind: "TEST_RESULT" as const,
						sortOrder: i,
					})),
				],
			})
		}

		for (const [index, color] of series.colors.entries()) {
			const slug = `${series.slug}-${slugify(color)}`
			await prisma.product.upsert({
				where: { slug },
				update: {},
				create: {
					name: color,
					slug,
					sku: skuFor(series.slug, color),
					seriesId: record.id,
					// Groups the same print film across formats: "Brookfield" is one
					// design in both Gold and Gold W.
					designName: color,
					images: [`/products/${series.legacyPath}/${slugify(color)}.jpg`],
					pricingUom: "SQFT",
					orderUoms: ["SQFT", "BOX", "PALLET"],
					isPublic: series.active,
					isActive: series.active,
					sortOrder: index,
				},
			})
			productCount++
		}

		console.log(
			`  ${series.name}: ${series.colors.length} colours` +
				(series.active ? "" : "  (inactive — pending the W-series answer)"),
		)
	}

	console.log(`\nDone. ${productCount} flooring products + ${ACCESSORIES.length} accessories.`)
	console.log("No dealers, prices or orders seeded — those need the client's price list.")
}

main()
	.then(async () => {
		await prisma.$disconnect()
	})
	.catch(async (error) => {
		console.error(error)
		await prisma.$disconnect()
		process.exit(1)
	})
