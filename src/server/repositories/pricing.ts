import "server-only"
import { db } from "@/server/db/client"
import type { Prisma } from "@/generated/prisma/client"
import { hasPrice, resolvePrice, type PriceResult } from "@/server/domain/pricing"
import { lfPerPieceOf } from "./catalog"

/**
 * Prices, resolved for one dealer.
 *
 * Every function here takes a `dealerId` as an argument rather than working it
 * out. That is the rule from the guards layer and it matters most in this file:
 * the whole commercial value of the system is that one dealer never sees
 * another's rates, and a function that decided for itself whose prices to
 * return would be one careless refactor from returning the wrong ones.
 */

export interface PricedProduct {
	id: string
	name: string
	slug: string
	sku: string
	images: string[]
	pricingUom: string
	orderUoms: string[]
	stockStatus: string
	seriesName: string
	sqFtPerBox: string | null
	boxesPerPallet: number | null
	lbPerBox: string | null
	/** Feet in one piece of trim. Null for anything not sold by the piece. */
	lfPerPiece: string | null
	/** Null when the product has no list price yet, which is not an error here. */
	price: PriceResult | null
}

/** The dealer's discount and their tier's, in one place. */
async function pricingFor(dealerId: string) {
	const dealer = await db.dealer.findUnique({
		where: { id: dealerId },
		select: {
			discountPct: true,
			priceTier: { select: { discountPct: true } },
		},
	})

	return {
		discountPct: dealer?.discountPct?.toString() ?? null,
		tierDiscountPct: dealer?.priceTier?.discountPct?.toString() ?? null,
	}
}

const catalogSelect = {
	id: true,
	name: true,
	slug: true,
	sku: true,
	images: true,
	pricingUom: true,
	orderUoms: true,
	stockStatus: true,
	listPrice: true,
	seriesId: true,
	category: { select: { name: true } },
	series: {
		select: { name: true, sqFtPerBox: true, boxesPerPallet: true, lbPerBox: true },
	},
	conversions: { select: { fromUom: true, toUom: true, factor: true } },
} as const

/**
 * What this dealer is offered.
 *
 * Most products are offered to everyone — `dealerRestricted` is false by
 * default and stays that way unless somebody narrows it deliberately. Only the
 * narrowed ones consult the grant table, so a dealer with no rows at all sees
 * the whole catalog, which is what the portal did before any of this
 * existed.
 *
 * Written once and used by both the listing and the count. Two copies of this
 * predicate is how a catalog ends up saying "12 of 46" over twelve rows.
 */
function offeredTo(dealerId: string): Prisma.ProductWhereInput {
	return {
		OR: [{ dealerRestricted: false }, { dealerAccess: { some: { dealerId } } }],
	}
}
/**
 * The whole catalog at this dealer's prices.
 *
 * A product with neither a list price nor a price for this dealer comes back
 * with `price: null` rather than throwing. The engine is right to refuse to
 * price it, but a catalog that fails to render because one color has not
 * been priced yet would be worse than one that shows the color and says so.
 */

export async function listPricedProducts(
	dealerId: string,
	/** Matches a color name or a SKU. Both are how a dealer refers to one. */
	search?: string,
): Promise<PricedProduct[]> {
	const q = search?.trim()

	const [pricing, products, overrides, seriesPrices] = await Promise.all([
		pricingFor(dealerId),
		db.product.findMany({
			where: {
				isActive: true,
				// Two independent conditions, so both live under AND rather than
				// fighting over the one OR key.
				AND: [
					offeredTo(dealerId),
					...(q
						? [
								{
									OR: [
										{ name: { contains: q, mode: "insensitive" as const } },
										{ sku: { contains: q, mode: "insensitive" as const } },
									],
								},
							]
						: []),
				],
			},
			select: catalogSelect,
			orderBy: [
				{ category: { sortOrder: "asc" } },
				{ series: { sortOrder: "asc" } },
				{ sortOrder: "asc" },
			],
		}),
		db.dealerPrice.findMany({
			where: { dealerId },
			select: { productId: true, price: true, discountPct: true },
		}),
		seriesPricesFor(dealerId),
	])

	const overrideByProduct = new Map(overrides.map((row) => [row.productId, row]))

	return products.map((product) => {
		const override = overrideByProduct.get(product.id)

		const listing = {
			listPrice: product.listPrice?.toString() ?? null,
			pricingUom: product.pricingUom,
		}
		const own = {
			price: override?.price?.toString() ?? null,
			discountPct: override?.discountPct?.toString() ?? null,
			seriesPrice: product.seriesId ? (seriesPrices.get(product.seriesId) ?? null) : null,
		}
		const price: PriceResult | null = hasPrice(listing, own)
			? resolvePrice(listing, pricing, own)
			: null

		return {
			id: product.id,
			name: product.name,
			slug: product.slug,
			sku: product.sku,
			images: product.images,
			pricingUom: product.pricingUom,
			orderUoms: product.orderUoms,
			stockStatus: product.stockStatus,
			seriesName: product.series?.name ?? product.category.name,
			sqFtPerBox: product.series?.sqFtPerBox?.toString() ?? null,
			boxesPerPallet: product.series?.boxesPerPallet ?? null,
			lbPerBox: product.series?.lbPerBox?.toString() ?? null,
			lfPerPiece: lfPerPieceOf(product.conversions),
			price,
		}
	})
}

export async function getPricedProduct(
	dealerId: string,
	slug: string,
): Promise<PricedProduct | null> {
	const [pricing, product] = await Promise.all([
		pricingFor(dealerId),
		db.product.findFirst({ where: { slug, isActive: true }, select: catalogSelect }),
	])

	if (!product) return null

	const [override, seriesPrice] = await Promise.all([
		db.dealerPrice.findUnique({
			where: { dealerId_productId: { dealerId, productId: product.id } },
			select: { price: true, discountPct: true },
		}),
		product.seriesId
			? db.dealerSeriesPrice.findUnique({
					where: { dealerId_seriesId: { dealerId, seriesId: product.seriesId } },
					select: { price: true },
				})
			: null,
	])

	const listing = {
		listPrice: product.listPrice?.toString() ?? null,
		pricingUom: product.pricingUom,
	}
	const own = {
		price: override?.price?.toString() ?? null,
		discountPct: override?.discountPct?.toString() ?? null,
		seriesPrice: seriesPrice?.price.toString() ?? null,
	}
	const price = hasPrice(listing, own) ? resolvePrice(listing, pricing, own) : null

	return {
		id: product.id,
		name: product.name,
		slug: product.slug,
		sku: product.sku,
		images: product.images,
		pricingUom: product.pricingUom,
		orderUoms: product.orderUoms,
		stockStatus: product.stockStatus,
		seriesName: product.series?.name ?? product.category.name,
		sqFtPerBox: product.series?.sqFtPerBox?.toString() ?? null,
		boxesPerPallet: product.series?.boxesPerPallet ?? null,
		lbPerBox: product.series?.lbPerBox?.toString() ?? null,
		lfPerPiece: lfPerPieceOf(product.conversions),
		price,
	}
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

/** Everything the owner needs to set one dealer's prices. */
export async function listDealerPricing(dealerId: string) {
	const [dealer, products, overrides, series, seriesPrices] = await Promise.all([
		db.dealer.findUnique({
			where: { id: dealerId },
			select: {
				id: true,
				companyName: true,
				discountPct: true,
				priceTier: { select: { id: true, name: true, discountPct: true } },
			},
		}),
		db.product.findMany({
			where: { isActive: true },
			select: {
				id: true,
				name: true,
				sku: true,
				listPrice: true,
				pricingUom: true,
				seriesId: true,
				category: { select: { name: true } },
				series: { select: { name: true, sortOrder: true } },
			},
			orderBy: [
				{ category: { sortOrder: "asc" } },
				{ series: { sortOrder: "asc" } },
				{ sortOrder: "asc" },
			],
		}),
		db.dealerPrice.findMany({
			where: { dealerId },
			select: { productId: true, price: true, discountPct: true },
		}),
		// Flooring series only: a series price is per square foot.
		db.series.findMany({
			where: { isActive: true, sqFtPerBox: { not: null } },
			select: {
				id: true,
				name: true,
				_count: { select: { products: { where: { isActive: true } } } },
			},
			orderBy: { sortOrder: "asc" },
		}),
		seriesPricesFor(dealerId),
	])

	return { dealer, products, overrides, series, seriesPrices }
}

/** This dealer's series prices, by series id. */
async function seriesPricesFor(dealerId: string): Promise<Map<string, string>> {
	const rows = await db.dealerSeriesPrice.findMany({
		where: { dealerId },
		select: { seriesId: true, price: true },
	})
	return new Map(rows.map((row) => [row.seriesId, row.price.toString()]))
}

/** Sets, or with no price clears, one dealer's price on a whole series. */
export async function setDealerSeriesPrice(
	dealerId: string,
	seriesId: string,
	price: string | null,
) {
	if (!price) {
		await db.dealerSeriesPrice.deleteMany({ where: { dealerId, seriesId } })
		return
	}
	await db.dealerSeriesPrice.upsert({
		where: { dealerId_seriesId: { dealerId, seriesId } },
		create: { dealerId, seriesId, price },
		update: { price },
	})
}

/** A product's list price, null when it has none, undefined when there is no such product. */
export async function listPriceOf(productId: string): Promise<string | null | undefined> {
	const product = await db.product.findUnique({
		where: { id: productId },
		select: { listPrice: true },
	})
	return product ? (product.listPrice?.toString() ?? null) : undefined
}

export async function upsertDealerPrice(data: {
	dealerId: string
	productId: string
	price?: string | null
	discountPct?: string | null
}) {
	// Nothing set means no override — the row is removed rather than kept as a
	// pair of nulls that the engine would have to interpret.
	if (!data.price && !data.discountPct) {
		await db.dealerPrice.deleteMany({
			where: { dealerId: data.dealerId, productId: data.productId },
		})
		return null
	}

	return db.dealerPrice.upsert({
		where: { dealerId_productId: { dealerId: data.dealerId, productId: data.productId } },
		create: {
			dealerId: data.dealerId,
			productId: data.productId,
			price: data.price ?? null,
			discountPct: data.discountPct ?? null,
		},
		update: { price: data.price ?? null, discountPct: data.discountPct ?? null },
		select: { id: true },
	})
}

export async function setDealerDiscount(dealerId: string, discountPct: string | null) {
	return db.dealer.update({
		where: { id: dealerId },
		data: { discountPct },
		select: { id: true, companyName: true },
	})
}

export async function listPriceTiers() {
	return db.priceTier.findMany({
		select: { id: true, name: true, discountPct: true, _count: { select: { dealers: true } } },
		orderBy: { sortOrder: "asc" },
	})
}

/**
 * How many products a dealer can see at all.
 *
 * Used next to a filtered list — "12 of 65" — so the search says what it is
 * hiding. A count rather than a second `listPricedProducts` call: the total
 * does not need every price resolved to be a number.
 */
export async function countOrderableProducts(dealerId: string): Promise<number> {
	return db.product.count({ where: { isActive: true, ...offeredTo(dealerId) } })
}
