import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"

/**
 * Seed — the client's own catalogue.
 *
 * Transcribed by hand from the sheet Nick is filling in, row by row, rather
 * than parsed. He is adding to it as he goes and the columns are still moving —
 * a SKU column and plank dimensions are coming — so a parser would be built
 * against a shape that is not settled yet, and a wrong guess about a column
 * lands silently in the catalogue.
 *
 * What replaced what: this file used to hold Bronze, Silver, Silver W, Gold and
 * Gold W, read off the current live site. Those were real, but they are the
 * names the client is retiring. His first real series is below; the old data is
 * still in the project's content-inventory.md if any of it is ever needed.
 */

const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }),
})

/**
 * AR - Commercial, 5mm / 20 mil.
 *
 * The sheet writes the series as "AR - Commercial 5/20". The "5/20" is the
 * spec, not part of the name — Nick confirmed it means 5mm board with a 20 mil
 * wear layer — so it is stored in the two fields that already exist for it and
 * the name is what appears on the site.
 *
 * `public` is his own Yes/No column, per colour. A "No" is not hidden: the
 * product exists and a signed-in dealer sees it, it is only kept off the public
 * catalogue. That is the split he asked for.
 *
 * Not here because he has not sent them yet: SKUs, plank length and width,
 * descriptions, images, and everything in the freight block — weight per box,
 * box dimensions, freight class.
 */
const SERIES = {
	name: "AR - Commercial",
	slug: "ar-commercial",
	skuPrefix: "ARC",
	thicknessMm: "5",
	wearLayerMil: 20,
	sqFtPerBox: "23.64",
	boxesPerPallet: 55,
	colors: [
		{ name: "Nightfall Hills", public: true },
		{ name: "Vintage Cabin", public: true },
		{ name: "Natural Oak", public: true },
		{ name: "Classic Lodge", public: false },
		{ name: "Golden Pine", public: true },
		{ name: "Berkley Oak", public: true },
		{ name: "Sierra Sands", public: false },
		{ name: "Rock Ferry", public: false },
		{ name: "Fountain Hills", public: true },
		{ name: "Vintage Hickory", public: false },
		{ name: "Mill Creek", public: false },
		{ name: "Sterling Oak", public: false },
		{ name: "Lighthouse Bay", public: true },
		{ name: "Brookfield", public: true },
		{ name: "Canal Point", public: false },
		{ name: "Placid Cabin", public: true },
		{ name: "Logging Camp Lite", public: false },
		{ name: "Everstill Forest Lite", public: true },
		{ name: "Cherry Point Lite", public: false },
		{ name: "River View Lite", public: true },
		{ name: "Kaneohe Bay Lite", public: true },
		{ name: "Catalina Lite", public: false },
		{ name: "Petrified Forest Lite", public: true },
		{ name: "Lake Lanier Lite", public: false },
		{ name: "Cumberland Lite", public: false },
		{ name: "Northshire Lite", public: true },
		{ name: "Parris Island Lite", public: true },
		{ name: "Oceanside Lite", public: false },
		{ name: "Sandy Plains", public: false },
		{ name: "Redwood Forest", public: true },
		{ name: "Mount Pleasant", public: true },
		{ name: "Cambridge", public: false },
		{ name: "Carolina Hickory", public: false },
		{ name: "Monterrey", public: true },
		{ name: "Stanford Oak", public: true },
		{ name: "Ruby Falls", public: false },
		{ name: "Charleston", public: true },
		{ name: "Houston", public: true },
		{ name: "Mesa", public: true },
		{ name: "Phoenix", public: true },
		{ name: "Providence", public: true },
		{ name: "Columbia", public: true },
		{ name: "Rock Creek", public: true },
	],
} as const

/**
 * Accessories — the counterexample to "price is always per square foot".
 *
 * Kept through the catalogue change. These are the client's own products, with
 * the prices publicly listed on his current site, and the template's own Series
 * column offers "Accessories" as a category — so they are not placeholder data
 * waiting to be replaced.
 *
 * No stick length is published, so none is invented here: the UOM engine keeps
 * linear feet continuous until the client says how these are bundled.
 */
const ACCESSORIES = [
	{
		name: '5-¼" Primed White Pine Baseboard',
		slug: "baseboard-5-25",
		sku: "ACC-BB-525",
		listPrice: "1.09",
	},
	{
		name: '3-¼" Primed White Pine Baseboard',
		slug: "baseboard-3-25",
		sku: "ACC-BB-325",
		listPrice: "0.69",
	},
	{
		name: '11/16" × 11/16" Primed White Pine Quarter Round',
		slug: "quarter-round",
		sku: "ACC-QR-1116",
		listPrice: "0.41",
	},
]

const slugify = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")

/**
 * Provisional, and replaced the moment Nick sends the real ones.
 *
 * The schema requires a unique SKU and his sheet does not have the column yet —
 * he said he would add it. Derived from the colour rather than numbered, so the
 * placeholder is recognisable as one and two runs produce the same value.
 */
const skuFor = (prefix: string, color: string) => `${prefix}-${slugify(color).toUpperCase()}`

async function main() {
	console.log("Seeding catalogue…")

	// --- Categories. Same ids the categories migration created, so seeding a
	// database that already ran it changes nothing.
	const flooring = await prisma.category.upsert({
		where: { slug: "flooring" },
		update: {},
		create: { id: "cat_flooring", name: "Flooring", slug: "flooring", sortOrder: 0 },
	})
	const accessories = await prisma.category.upsert({
		where: { slug: "accessories" },
		update: {},
		create: { id: "cat_accessories", name: "Accessories", slug: "accessories", sortOrder: 100 },
	})

	// --- Accessories have no series: there are no plank specs to inherit.

	for (const [index, item] of ACCESSORIES.entries()) {
		await prisma.product.upsert({
			where: { slug: item.slug },
			update: {},
			create: {
				name: item.name,
				slug: item.slug,
				sku: item.sku,
				categoryId: accessories.id,
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
	const series = await prisma.series.upsert({
		where: { slug: SERIES.slug },
		update: {},
		create: {
			name: SERIES.name,
			slug: SERIES.slug,
			thicknessMm: SERIES.thicknessMm,
			wearLayerMil: SERIES.wearLayerMil,
			sqFtPerBox: SERIES.sqFtPerBox,
			boxesPerPallet: SERIES.boxesPerPallet,
			// The two documents the current site serves. Five copies of each sit
			// under /upload/prod/{series}/ there and they are byte-identical —
			// verified by checksum — so one pair is what is actually true. Still
			// on the list for the client to confirm they are current.
			warrantyPdfUrl: "/documents/warranty.pdf",
			installationPdfUrl: "/documents/installation-instructions.pdf",
			isActive: true,
			sortOrder: 1,
		},
	})

	for (const [index, color] of SERIES.colors.entries()) {
		const slug = `${SERIES.slug}-${slugify(color.name)}`
		await prisma.product.upsert({
			where: { slug },
			update: {},
			create: {
				name: color.name,
				slug,
				sku: skuFor(SERIES.skuPrefix, color.name),
				categoryId: flooring.id,
				seriesId: series.id,
				// Groups the same print film across formats, for the day a colour
				// is stocked in more than one plank size.
				designName: color.name,
				// Left empty deliberately. There are film images on file under the
				// old series names and several match these colours exactly, but
				// matching them by name would be a guess about which film a colour
				// actually uses — and a wrong grain on a product page is worse than
				// no picture. Nick is sending photographs separately.
				images: [],
				pricingUom: "SQFT",
				orderUoms: ["SQFT", "BOX", "PALLET"],
				isPublic: color.public,
				isActive: true,
				sortOrder: index,
			},
		})
	}

	const publicCount = SERIES.colors.filter((color) => color.public).length
	console.log(
		`  ${SERIES.name}: ${SERIES.colors.length} colours ` +
			`(${publicCount} public, ${SERIES.colors.length - publicCount} dealer-only)`,
	)

	console.log(
		`\nDone. ${SERIES.colors.length} flooring products + ${ACCESSORIES.length} accessories.`,
	)
	console.log("No dealers, prices or orders seeded — the dealer sheet is still empty.")
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
