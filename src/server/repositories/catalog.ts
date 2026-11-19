import "server-only"
import { db } from "@/server/db/client"
import type { OrderUom, Prisma, PricingUom, StockStatus } from "@/generated/prisma/client"

/**
 * Series and product reads and writes.
 *
 * Public reads are separate functions from admin reads on purpose. A public
 * listing must never return a product the owner has not published, and the way
 * to guarantee that is for the public path to have no way of asking for one —
 * not a flag that someone remembers to pass.
 */

const productCard = {
	id: true,
	name: true,
	slug: true,
	sku: true,
	images: true,
	designName: true,
	stockStatus: true,
	pricingUom: true,
	orderUoms: true,
	category: { select: { id: true, name: true, slug: true } },
	// Wear layer and box coverage so the catalog can group flooring by wear layer.
	series: {
		select: { id: true, name: true, slug: true, wearLayerMil: true, sqFtPerBox: true },
	},
} satisfies Prisma.ProductSelect

export type ProductCard = Prisma.ProductGetPayload<{ select: typeof productCard }>

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/**
 * What "published" means everywhere on the public site.
 *
 * The product is public and active, and so is the category it sits in, so
 * hiding a category in admin takes its whole shelf off the site in one go.
 * Narrowed to one category by slug when given.
 */
export function publishedProducts(categorySlug?: string) {
	return {
		isPublic: true,
		isActive: true,
		category: { isActive: true, ...(categorySlug ? { slug: categorySlug } : {}) },
	} satisfies Prisma.ProductWhereInput
}

/**
 * Categories that have at least one published product, in the owner's order.
 *
 * An empty shelf is left out rather than shown with a zero beside it: "Carpet
 * (0)" in the menu is a promise the catalog does not keep yet.
 */
export async function listPublicCategories() {
	return db.category.findMany({
		where: { isActive: true, products: { some: { isPublic: true, isActive: true } } },
		select: {
			id: true,
			name: true,
			slug: true,
			blurb: true,
			_count: { select: { products: { where: { isPublic: true, isActive: true } } } },
			products: {
				where: { isPublic: true, isActive: true, NOT: { images: { isEmpty: true } } },
				select: { images: true },
				orderBy: { sortOrder: "asc" },
				take: 1,
			},
		},
		orderBy: { sortOrder: "asc" },
	})
}

/**
 * A series is a flooring spec group, so only a series with square feet per
 * box counts. The old spec-less "Accessories" series predates categories and
 * is kept only until the catalog import retires it.
 */
const flooringSeries = {
	isActive: true,
	sqFtPerBox: { not: null },
} satisfies Prisma.SeriesWhereInput

/**
 * Series that have at least one published product.
 *
 * Narrowed to one category when given, so the series row under "Flooring"
 * never offers a spec group from another shelf.
 */
export async function listPublicSeries(categorySlug?: string) {
	const published = publishedProducts(categorySlug)

	return db.series.findMany({
		where: { ...flooringSeries, products: { some: published } },
		select: {
			id: true,
			name: true,
			slug: true,
			blurb: true,
			widthIn: true,
			thicknessMm: true,
			wearLayerMil: true,
			finishing: true,
			sqFtPerBox: true,
			boxesPerPallet: true,
			_count: { select: { products: { where: published } } },
			// One swatch per series, so a card never renders an empty image slot
			// because its colors happened to fall outside a paged list.
			products: {
				where: { ...published, NOT: { images: { isEmpty: true } } },
				select: { images: true },
				orderBy: { sortOrder: "asc" },
				take: 1,
			},
		},
		orderBy: { sortOrder: "asc" },
	})
}

/**
 * How the catalog can be ordered.
 *
 * The default is the owner's own arrangement — series order, then his sort
 * order within it. That is a merchandising decision he makes in admin, and
 * alphabetical would quietly override it.
 */
export type CatalogSort = "curated" | "name" | "series"

const SORTS: Record<CatalogSort, Prisma.ProductOrderByWithRelationInput[]> = {
	curated: [
		{ category: { sortOrder: "asc" } },
		{ series: { sortOrder: "asc" } },
		{ sortOrder: "asc" },
	],
	name: [{ name: "asc" }],
	series: [{ category: { sortOrder: "asc" } }, { series: { sortOrder: "asc" } }, { name: "asc" }],
}

export interface CatalogFilters {
	categorySlug?: string
	seriesSlug?: string
	/** Matches a color name or a SKU. Dealers know both; the public knows one. */
	search?: string
	/** Series-level specs. A buyer matching a commercial spec knows the number,
	 *  not which series happens to carry it. */
	wearLayerMil?: number
	thicknessMm?: string
	sort?: CatalogSort
	take?: number
}

export async function listPublicProducts(options: CatalogFilters = {}) {
	const search = options.search?.trim()

	// One series condition, built once. Spreading two `series` keys let the
	// second silently replace the first.
	const series: Prisma.SeriesWhereInput = {
		...(options.seriesSlug ? { slug: options.seriesSlug } : {}),
		...(options.wearLayerMil ? { wearLayerMil: options.wearLayerMil } : {}),
		...(options.thicknessMm ? { thicknessMm: options.thicknessMm } : {}),
	}

	return db.product.findMany({
		where: {
			...publishedProducts(options.categorySlug),
			...(Object.keys(series).length ? { series } : {}),
			...(search
				? {
						OR: [
							{ name: { contains: search, mode: "insensitive" as const } },
							{ sku: { contains: search, mode: "insensitive" as const } },
						],
					}
				: {}),
		},
		select: productCard,
		orderBy: SORTS[options.sort ?? "curated"],
		...(options.take ? { take: options.take } : {}),
	})
}

/**
 * The spec values actually present in the catalog.
 *
 * Read from the data rather than hardcoded, so a filter never offers "20 mil"
 * when nothing on the site has it — an empty result the visitor asked for is
 * worse than not offering the choice.
 */
export async function listSpecFacets(categorySlug?: string) {
	const series = await db.series.findMany({
		where: {
			...flooringSeries,
			products: { some: publishedProducts(categorySlug) },
		},
		select: { wearLayerMil: true, thicknessMm: true },
	})

	const wearLayers = [
		...new Set(series.map((s) => s.wearLayerMil).filter((v): v is number => v != null)),
	].sort((a, b) => a - b)

	const thicknesses = [
		...new Set(series.map((s) => s.thicknessMm?.toString()).filter((v): v is string => !!v)),
	].sort((a, b) => Number(a) - Number(b))

	return { wearLayers, thicknesses }
}

/**
 * One published product.
 *
 * A series without square feet per box is handed back as no series at all.
 * That is the old spec-less "Accessories" series, and passing it through made
 * the page treat a baseboard as flooring — a plank spec table, a coverage
 * description and a sample offer.
 */
export async function getPublicProduct(slug: string) {
	const product = await db.product.findFirst({
		where: { slug, ...publishedProducts() },
		select: {
			...productCard,
			description: true,
			conversions: { select: { fromUom: true, toUom: true, factor: true } },
			series: {
				select: {
					id: true,
					name: true,
					slug: true,
					lengthIn: true,
					widthIn: true,
					thicknessMm: true,
					wearLayerMil: true,
					finishing: true,
					edgeProfile: true,
					sqFtPerBox: true,
					boxesPerPallet: true,
					lbPerBox: true,
					warrantyPdfUrl: true,
					installationPdfUrl: true,
					facts: { orderBy: [{ kind: "asc" }, { sortOrder: "asc" }] },
				},
			},
		},
	})
	if (!product) return null
	return { ...product, series: product.series?.sqFtPerBox ? product.series : null }
}

/** Every published slug, for the sitemap and for static generation. */
export async function listPublicProductSlugs(): Promise<string[]> {
	const rows = await db.product.findMany({
		where: publishedProducts(),
		select: { slug: true },
	})
	return rows.map((row) => row.slug)
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function listAllCategories() {
	return db.category.findMany({
		select: {
			id: true,
			name: true,
			slug: true,
			isActive: true,
			sortOrder: true,
			_count: { select: { products: true } },
		},
		orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
	})
}

export async function getCategory(id: string) {
	return db.category.findUnique({
		where: { id },
		include: { _count: { select: { products: true } } },
	})
}

/** For the "which category" control on the product form. */
export async function listCategoryOptions() {
	return db.category.findMany({
		select: { id: true, name: true, isActive: true },
		orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
	})
}

/** Is this name or slug already taken by a different category? */
export async function findConflictingCategory(name: string, slug: string, exceptId?: string) {
	return db.category.findFirst({
		where: {
			OR: [{ name: { equals: name, mode: "insensitive" } }, { slug }],
			...(exceptId ? { NOT: { id: exceptId } } : {}),
		},
		select: { id: true, name: true, slug: true },
	})
}

export async function createCategory(data: {
	name: string
	slug: string
	blurb?: string
	sortOrder: number
}) {
	return db.category.create({
		data: {
			name: data.name,
			slug: data.slug,
			blurb: data.blurb ?? null,
			sortOrder: data.sortOrder,
		},
		select: { id: true, name: true, slug: true },
	})
}

/**
 * The slug is not edited with the name.
 *
 * It is the address of a catalog page someone may have bookmarked or a
 * search engine indexed. Renaming "Trim" to "Trim & Moldings" should not move
 * the page.
 */
export async function updateCategory(
	id: string,
	data: { name: string; blurb?: string; sortOrder: number; isActive: boolean },
) {
	return db.category.update({
		where: { id },
		data: {
			name: data.name,
			blurb: data.blurb ?? null,
			sortOrder: data.sortOrder,
			isActive: data.isActive,
		},
		select: { id: true, name: true, slug: true },
	})
}

export async function listAllSeries() {
	return db.series.findMany({
		select: {
			id: true,
			name: true,
			slug: true,
			widthIn: true,
			thicknessMm: true,
			wearLayerMil: true,
			sqFtPerBox: true,
			boxesPerPallet: true,
			lbPerBox: true,
			freightClass: true,
			isActive: true,
			sortOrder: true,
			_count: { select: { products: true } },
		},
		orderBy: { sortOrder: "asc" },
	})
}

export async function getSeries(id: string) {
	return db.series.findUnique({
		where: { id },
		include: {
			facts: { orderBy: [{ kind: "asc" }, { sortOrder: "asc" }] },
			// A count rather than the rows: the edit screen only needs to say how
			// many colors a spec change will move.
			_count: { select: { products: true } },
		},
	})
}

/** For the "pick a series" control on the product form. */
export async function listSeriesOptions() {
	return db.series.findMany({
		select: { id: true, name: true, sqFtPerBox: true, isActive: true },
		orderBy: { sortOrder: "asc" },
	})
}

export async function listAllProducts(
	options: { search?: string; seriesId?: string; categoryId?: string } = {},
) {
	return db.product.findMany({
		where: {
			...(options.categoryId ? { categoryId: options.categoryId } : {}),
			...(options.seriesId ? { seriesId: options.seriesId } : {}),
			...(options.search
				? {
						OR: [
							{ name: { contains: options.search, mode: "insensitive" } },
							{ sku: { contains: options.search, mode: "insensitive" } },
						],
					}
				: {}),
		},
		select: { ...productCard, isPublic: true, isActive: true, listPrice: true },
		orderBy: SORTS.curated,
	})
}

export async function getProduct(id: string) {
	return db.product.findUnique({
		where: { id },
		include: {
			category: { select: { id: true, name: true } },
			series: { select: { id: true, name: true, sqFtPerBox: true } },
			conversions: { select: { fromUom: true, toUom: true, factor: true } },
		},
	})
}

/**
 * Adding a product.
 *
 * Still a handful of fields: a name, a code, a category, and either a series
 * (flooring, which inherits every spec and packaging figure from it) or the
 * unit it is sold by (everything else). Nothing is typed twice.
 */
export async function createProduct(data: {
	name: string
	slug: string
	sku: string
	categoryId: string
	seriesId?: string
	soldBy: "EACH" | "PIECE" | "LF" | "ROLL"
	/** Feet in one piece. Read only when sold by the piece. */
	lfPerPiece?: string
	imageUrl?: string
	designName?: string
}) {
	const series = data.seriesId
		? await db.series.findUnique({ where: { id: data.seriesId }, select: { sqFtPerBox: true } })
		: null

	// A series with sq ft per box is flooring: priced per square foot and
	// ordered by the box. Anything else is priced and ordered in the unit it is
	// sold by, which is the "Sold By" column the client asked for.
	const flooring = Boolean(series?.sqFtPerBox)
	const byPiece = !flooring && data.soldBy === "PIECE" && data.lfPerPiece !== undefined

	return db.product.create({
		data: {
			name: data.name,
			slug: data.slug,
			sku: data.sku,
			categoryId: data.categoryId,
			seriesId: data.seriesId ?? null,
			designName: data.designName ?? data.name,
			images: data.imageUrl ? [data.imageUrl] : [],
			...unitsFor(flooring, data.soldBy),
			// The piece length is a conversion row, the same place the order
			// engine already looks for it — see orders.ts convert().
			conversions: byPiece
				? { create: { fromUom: "STICK", toUom: "LF", factor: data.lfPerPiece! } }
				: undefined,
			isPublic: false,
			isActive: true,
		},
		select: { id: true, name: true, slug: true },
	})
}

/**
 * How a new product is priced and ordered.
 *
 * A piece of trim is priced per foot and ordered by the piece, but a dealer who
 * has measured a room in feet can still type feet: the engine rounds that up
 * to whole pieces, the way square feet round up to whole boxes.
 */
function unitsFor(
	flooring: boolean,
	soldBy: "EACH" | "PIECE" | "LF" | "ROLL",
): { pricingUom: PricingUom; orderUoms: OrderUom[] } {
	if (flooring) return { pricingUom: "SQFT", orderUoms: ["SQFT", "BOX", "PALLET"] }
	if (soldBy === "PIECE") return { pricingUom: "LF", orderUoms: ["STICK", "LF"] }
	return { pricingUom: soldBy, orderUoms: [soldBy] }
}

/** The feet in one piece, from a product's conversion rows. */
export function lfPerPieceOf(
	conversions: readonly { fromUom: string; toUom: string; factor: { toString(): string } }[],
): string | null {
	const row = conversions.find((c) => c.fromUom === "STICK" && c.toUom === "LF")
	return row ? row.factor.toString() : null
}

export async function updateProduct(
	id: string,
	data: {
		name: string
		sku: string
		categoryId: string
		seriesId?: string
		designName?: string
		description?: string
		listPrice?: string
		pricingUom: PricingUom
		orderUoms: OrderUom[]
		stockStatus: StockStatus
		isPublic: boolean
		isActive: boolean
		images: string[]
		dealerRestricted: boolean
		/** Undefined clears it. */
		lfPerPiece?: string
	},
) {
	const pieceRow = { productId: id, fromUom: "STICK" as const, toUom: "LF" as const }
	const [product] = await db.$transaction([
		db.product.update({
			where: { id },
			data: {
				name: data.name,
				sku: data.sku,
				categoryId: data.categoryId,
				seriesId: data.seriesId ?? null,
				designName: data.designName ?? null,
				description: data.description ?? null,
				listPrice: data.listPrice ?? null,
				pricingUom: data.pricingUom,
				orderUoms: data.orderUoms,
				stockStatus: data.stockStatus,
				isPublic: data.isPublic,
				isActive: data.isActive,
				images: data.images,
				dealerRestricted: data.dealerRestricted,
			},
			select: { id: true, name: true },
		}),
		data.lfPerPiece
			? db.uomConversion.upsert({
					where: { productId_fromUom_toUom: pieceRow },
					create: { ...pieceRow, factor: data.lfPerPiece },
					update: { factor: data.lfPerPiece },
				})
			: db.uomConversion.deleteMany({ where: pieceRow }),
	])
	return product
}

export async function findConflictingSeries(name: string, slug: string) {
	return db.series.findFirst({
		where: { OR: [{ name: { equals: name, mode: "insensitive" } }, { slug }] },
		select: { id: true, name: true },
	})
}

/**
 * A series with a name and nothing else, placed after the existing ones.
 *
 * Until it has square feet per box it is a series with no specs, which the
 * public catalog does not list as a flooring line — so it stays out of
 * sight while the owner fills it in.
 */
export async function createSeries(data: { name: string; slug: string }) {
	const last = await db.series.aggregate({ _max: { sortOrder: true } })
	return db.series.create({
		data: { name: data.name, slug: data.slug, sortOrder: (last._max.sortOrder ?? 0) + 1 },
		select: { id: true, name: true, slug: true },
	})
}

export async function updateSeries(
	id: string,
	data: {
		name: string
		blurb?: string
		lengthIn?: string
		widthIn?: string
		thicknessMm?: string
		wearLayerMil?: number
		finishing?: string
		edgeProfile?: string
		sqFtPerBox?: string
		boxesPerPallet?: number
		lbPerBox?: string
		lbPerPallet?: string
		palletsPerFtl?: number
		freightClass?: string
		nmfcCode?: string
		isActive: boolean
	},
) {
	return db.series.update({
		where: { id },
		data: {
			name: data.name,
			blurb: data.blurb ?? null,
			lengthIn: data.lengthIn ?? null,
			widthIn: data.widthIn ?? null,
			thicknessMm: data.thicknessMm ?? null,
			wearLayerMil: data.wearLayerMil ?? null,
			finishing: data.finishing ?? null,
			edgeProfile: data.edgeProfile ?? null,
			sqFtPerBox: data.sqFtPerBox ?? null,
			boxesPerPallet: data.boxesPerPallet ?? null,
			lbPerBox: data.lbPerBox ?? null,
			lbPerPallet: data.lbPerPallet ?? null,
			palletsPerFtl: data.palletsPerFtl ?? null,
			freightClass: data.freightClass ?? null,
			nmfcCode: data.nmfcCode ?? null,
			isActive: data.isActive,
		},
		select: { id: true, name: true },
	})
}

/** Is this slug or SKU already taken by a different product? */
export async function findConflicting(slug: string, sku: string, exceptId?: string) {
	return db.product.findFirst({
		where: {
			OR: [{ slug }, { sku }],
			...(exceptId ? { NOT: { id: exceptId } } : {}),
		},
		select: { id: true, slug: true, sku: true },
	})
}

/**
 * How many colors are on the public catalog.
 *
 * Flooring only. Baseboard and quarter round are published products but they
 * are not colors, and counting them made the home page claim three more than
 * the client actually stocks.
 */
export async function countPublicColors(): Promise<number> {
	return db.product.count({
		where: { ...publishedProducts(), series: { sqFtPerBox: { not: null } } },
	})
}

/**
 * Everything published, including trim.
 *
 * Distinct from `countPublicColors`, which is flooring only. The catalog
 * filter counts products — a dealer buying baseboard is buying from the same
 * catalog — while the "colors in stock" claim on the home page means colors.
 * Using one number for both made "All (34)" sit above six filters adding to 37.
 */
export async function countPublicProducts(): Promise<number> {
	return db.product.count({ where: publishedProducts() })
}

/**
 * Just the name, and only if it is published.
 *
 * Used by the sample request. Checking `isActive` here is what stops somebody
 * posting a product id for a color that was pulled from the catalog and
 * getting a sample request logged against it.
 */
/** The product a pricing inquiry is about: published, so the form cannot be pointed elsewhere. */
export async function getInquiryProduct(productId: string) {
	return db.product.findFirst({
		where: { id: productId, ...publishedProducts() },
		select: { name: true, sku: true },
	})
}

export async function getProductName(productId: string): Promise<string | null> {
	const product = await db.product.findFirst({
		where: { id: productId, isActive: true },
		select: { name: true },
	})
	return product?.name ?? null
}

/**
 * Replaces the set of dealers a restricted product is offered to.
 *
 * Deleted and rewritten rather than diffed. The list is a handful of rows
 * per product, the whole set arrives from one form, and a diff would be more
 * code standing between the owner and what he just ticked.
 *
 * Runs even when the product is unrestricted, so a list survives the flag
 * being turned off and back on.
 */
export async function setProductAccess(productId: string, dealerIds: string[]) {
	await db.$transaction([
		db.dealerProductAccess.deleteMany({ where: { productId } }),
		db.dealerProductAccess.createMany({
			data: dealerIds.map((dealerId) => ({ productId, dealerId })),
			skipDuplicates: true,
		}),
	])
}

/** The dealers a product is currently offered to. */
export async function getProductAccess(productId: string): Promise<string[]> {
	const rows = await db.dealerProductAccess.findMany({
		where: { productId },
		select: { dealerId: true },
	})
	return rows.map((row) => row.dealerId)
}
