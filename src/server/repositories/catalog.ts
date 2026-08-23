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
	series: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ProductSelect

export type ProductCard = Prisma.ProductGetPayload<{ select: typeof productCard }>

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/** Series that have at least one published product. */
export async function listPublicSeries() {
	return db.series.findMany({
		where: { isActive: true, products: { some: { isPublic: true, isActive: true } } },
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
			_count: { select: { products: { where: { isPublic: true, isActive: true } } } },
			// One swatch per series, so a card never renders an empty image slot
			// because its colours happened to fall outside a paged list.
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

export async function listPublicProducts(options: { seriesSlug?: string; take?: number } = {}) {
	return db.product.findMany({
		where: {
			isPublic: true,
			isActive: true,
			...(options.seriesSlug ? { series: { slug: options.seriesSlug } } : {}),
		},
		select: productCard,
		orderBy: [{ series: { sortOrder: "asc" } }, { sortOrder: "asc" }],
		...(options.take ? { take: options.take } : {}),
	})
}

export async function getPublicProduct(slug: string) {
	return db.product.findFirst({
		where: { slug, isPublic: true, isActive: true },
		select: {
			...productCard,
			description: true,
			orderUoms: true,
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
}

/** Every published slug, for the sitemap and for static generation. */
export async function listPublicProductSlugs(): Promise<string[]> {
	const rows = await db.product.findMany({
		where: { isPublic: true, isActive: true },
		select: { slug: true },
	})
	return rows.map((row) => row.slug)
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

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
			// many colours a spec change will move.
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

export async function listAllProducts(options: { search?: string; seriesId?: string } = {}) {
	return db.product.findMany({
		where: {
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
		orderBy: [{ series: { sortOrder: "asc" } }, { sortOrder: "asc" }],
	})
}

export async function getProduct(id: string) {
	return db.product.findUnique({
		where: { id },
		include: { series: { select: { id: true, name: true, sqFtPerBox: true } } },
	})
}

/**
 * Adding a colour.
 *
 * Four fields, which is the promise the plan makes to the client when he asks
 * how hard it is to put a new product in: a name, a code, an image and which
 * series it belongs to. Everything else — specs, packaging, freight class —
 * is inherited from the series and never re-entered.
 */
export async function createProduct(data: {
	name: string
	slug: string
	sku: string
	seriesId: string
	imageUrl?: string
	designName?: string
}) {
	const series = await db.series.findUnique({
		where: { id: data.seriesId },
		select: { sqFtPerBox: true },
	})

	return db.product.create({
		data: {
			name: data.name,
			slug: data.slug,
			sku: data.sku,
			seriesId: data.seriesId,
			designName: data.designName ?? data.name,
			images: data.imageUrl ? [data.imageUrl] : [],
			// A series with sq ft per box is flooring; anything else is priced in
			// its own unit. Derived rather than asked, because the answer is
			// already implied by the series they picked.
			pricingUom: series?.sqFtPerBox ? "SQFT" : "EACH",
			orderUoms: series?.sqFtPerBox ? ["SQFT", "BOX", "PALLET"] : ["EACH"],
			isPublic: false,
			isActive: true,
		},
		select: { id: true, name: true, slug: true },
	})
}

export async function updateProduct(
	id: string,
	data: {
		name: string
		sku: string
		seriesId: string
		designName?: string
		description?: string
		listPrice?: string
		pricingUom: PricingUom
		orderUoms: OrderUom[]
		stockStatus: StockStatus
		isPublic: boolean
		isActive: boolean
	},
) {
	return db.product.update({
		where: { id },
		data: {
			name: data.name,
			sku: data.sku,
			seriesId: data.seriesId,
			designName: data.designName ?? null,
			description: data.description ?? null,
			listPrice: data.listPrice ?? null,
			pricingUom: data.pricingUom,
			orderUoms: data.orderUoms,
			stockStatus: data.stockStatus,
			isPublic: data.isPublic,
			isActive: data.isActive,
		},
		select: { id: true, name: true },
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
 * How many colours are on the public catalogue.
 *
 * Flooring only. Baseboard and quarter round are published products but they
 * are not colours, and counting them made the home page claim three more than
 * the client actually stocks.
 */
export async function countPublicColours(): Promise<number> {
	return db.product.count({
		where: { isPublic: true, isActive: true, series: { sqFtPerBox: { not: null } } },
	})
}

/**
 * Everything published, including trim.
 *
 * Distinct from `countPublicColours`, which is flooring only. The catalogue
 * filter counts products — a dealer buying baseboard is buying from the same
 * catalogue — while the "colours in stock" claim on the home page means colours.
 * Using one number for both made "All (34)" sit above six filters adding to 37.
 */
export async function countPublicProducts(): Promise<number> {
	return db.product.count({ where: { isPublic: true, isActive: true } })
}
