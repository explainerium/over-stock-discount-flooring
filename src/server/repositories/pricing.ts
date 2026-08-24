import "server-only"
import { db } from "@/server/db/client"
import { resolvePrice, type PriceResult } from "@/server/domain/pricing"

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
	series: {
		select: { name: true, sqFtPerBox: true, boxesPerPallet: true, lbPerBox: true },
	},
} as const

/**
 * The whole catalogue at this dealer's prices.
 *
 * A product with no list price comes back with `price: null` rather than
 * throwing. The engine is right to refuse to price it, but a catalogue that
 * fails to render because one colour has not been priced yet would be worse
 * than one that shows the colour and says so.
 */
export async function listPricedProducts(
	dealerId: string,
	/** Matches a colour name or a SKU. Both are how a dealer refers to one. */
	search?: string,
): Promise<PricedProduct[]> {
	const q = search?.trim()

	const [pricing, products, overrides] = await Promise.all([
		pricingFor(dealerId),
		db.product.findMany({
			where: {
				isActive: true,
				...(q
					? {
							OR: [
								{ name: { contains: q, mode: "insensitive" as const } },
								{ sku: { contains: q, mode: "insensitive" as const } },
							],
						}
					: {}),
			},
			select: catalogSelect,
			orderBy: [{ series: { sortOrder: "asc" } }, { sortOrder: "asc" }],
		}),
		db.dealerPrice.findMany({
			where: { dealerId },
			select: { productId: true, price: true, discountPct: true },
		}),
	])

	const overrideByProduct = new Map(overrides.map((row) => [row.productId, row]))

	return products.map((product) => {
		const override = overrideByProduct.get(product.id)

		let price: PriceResult | null = null
		if (product.listPrice) {
			price = resolvePrice(
				{ listPrice: product.listPrice.toString(), pricingUom: product.pricingUom },
				pricing,
				{
					price: override?.price?.toString() ?? null,
					discountPct: override?.discountPct?.toString() ?? null,
				},
			)
		}

		return {
			id: product.id,
			name: product.name,
			slug: product.slug,
			sku: product.sku,
			images: product.images,
			pricingUom: product.pricingUom,
			orderUoms: product.orderUoms,
			stockStatus: product.stockStatus,
			seriesName: product.series.name,
			sqFtPerBox: product.series.sqFtPerBox?.toString() ?? null,
			boxesPerPallet: product.series.boxesPerPallet,
			lbPerBox: product.series.lbPerBox?.toString() ?? null,
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

	const override = await db.dealerPrice.findUnique({
		where: { dealerId_productId: { dealerId, productId: product.id } },
		select: { price: true, discountPct: true },
	})

	const price = product.listPrice
		? resolvePrice(
				{ listPrice: product.listPrice.toString(), pricingUom: product.pricingUom },
				pricing,
				{
					price: override?.price?.toString() ?? null,
					discountPct: override?.discountPct?.toString() ?? null,
				},
			)
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
		seriesName: product.series.name,
		sqFtPerBox: product.series.sqFtPerBox?.toString() ?? null,
		boxesPerPallet: product.series.boxesPerPallet,
		lbPerBox: product.series.lbPerBox?.toString() ?? null,
		price,
	}
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

/** Everything the owner needs to set one dealer's prices. */
export async function listDealerPricing(dealerId: string) {
	const [dealer, products, overrides] = await Promise.all([
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
				series: { select: { name: true, sortOrder: true } },
			},
			orderBy: [{ series: { sortOrder: "asc" } }, { sortOrder: "asc" }],
		}),
		db.dealerPrice.findMany({
			where: { dealerId },
			select: { productId: true, price: true, discountPct: true },
		}),
	])

	return { dealer, products, overrides }
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
export async function countOrderableProducts(): Promise<number> {
	return db.product.count({ where: { isActive: true } })
}
