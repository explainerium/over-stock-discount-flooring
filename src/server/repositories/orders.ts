import "server-only"
import Decimal from "decimal.js"
import { db } from "@/server/db/client"
import { lineTotal, resolvePrice, sumLines } from "@/server/domain/pricing"
import { resolve as resolveUom, type Uom } from "@/server/domain/uom"

/**
 * Orders, starting with the cart.
 *
 * The cart IS an order — a row in DRAFT. It is not browser storage and not a
 * client-side store, because the people using it move: a counter person starts
 * an order on the showroom iPad and finishes it at a desk, and the owner needs
 * to be able to look at a half-built order when a dealer rings up about it.
 *
 * Every function takes `dealerId` explicitly. Same rule as everywhere else, and
 * the stakes are highest here — an order fetched for the wrong dealer is that
 * dealer's prices handed to a competitor.
 */

const lineSelect = {
	id: true,
	productId: true,
	unitSelected: true,
	qtyEntered: true,
	qtyBase: true,
	uomBase: true,
	boxes: true,
	sqFt: true,
	weightLb: true,
	unitPrice: true,
	lineTotal: true,
	productNameSnapshot: true,
	productSkuSnapshot: true,
	sortOrder: true,
	product: {
		select: {
			slug: true,
			images: true,
			pricingUom: true,
			orderUoms: true,
			stockStatus: true,
			series: { select: { name: true } },
		},
	},
} as const

/**
 * The dealer's open cart, created if they do not have one.
 *
 * One draft per dealer rather than per user: two people at the same company
 * building two separate carts and each submitting half an order is a support
 * call, not a feature.
 */
export async function getOrCreateDraft(dealerId: string) {
	const existing = await db.order.findFirst({
		where: { dealerId, status: "DRAFT" },
		select: { id: true },
	})
	if (existing) return existing.id

	const created = await db.order.create({
		data: { dealerId, status: "DRAFT" },
		select: { id: true },
	})
	return created.id
}

export async function getDraft(dealerId: string) {
	return db.order.findFirst({
		where: { dealerId, status: "DRAFT" },
		select: {
			id: true,
			subtotal: true,
			freight: true,
			tax: true,
			total: true,
			totalWeightLb: true,
			palletCount: true,
			dealerNotes: true,
			shipToAddressId: true,
			items: { select: lineSelect, orderBy: { sortOrder: "asc" } },
		},
	})
}

/**
 * What the engines need about one product, assembled from the series and any
 * per-product override.
 *
 * Specs come off the series unless the product overrides them — which is the
 * whole reason specs live on the series, and the reason this lookup is in one
 * place rather than repeated wherever a line is priced.
 */
async function specFor(productId: string, dealerId: string) {
	const [product, dealer, override] = await Promise.all([
		db.product.findUnique({
			where: { id: productId },
			select: {
				id: true,
				name: true,
				sku: true,
				listPrice: true,
				pricingUom: true,
				orderUoms: true,
				isActive: true,
				sqFtPerBoxOverride: true,
				boxesPerPalletOverride: true,
				conversions: { select: { fromUom: true, toUom: true, factor: true } },
				series: { select: { sqFtPerBox: true, boxesPerPallet: true, lbPerBox: true } },
			},
		}),
		db.dealer.findUnique({
			where: { id: dealerId },
			select: { discountPct: true, priceTier: { select: { discountPct: true } } },
		}),
		db.dealerPrice.findUnique({
			where: { dealerId_productId: { dealerId, productId } },
			select: { price: true, discountPct: true },
		}),
	])

	return { product, dealer, override }
}

export interface LineInput {
	dealerId: string
	productId: string
	unit: Uom
	quantity: string
	wasteFactorPct?: number
}

export class OrderError extends Error {
	constructor(
		message: string,
		readonly code: "PRODUCT_UNAVAILABLE" | "NO_PRICE" | "NOT_FOUND",
	) {
		super(message)
		this.name = "OrderError"
	}
}

/**
 * Converts and prices one line.
 *
 * Both engines, in the order they have to run: work out what actually ships,
 * then price what actually ships. Pricing the figure the dealer typed rather
 * than the coverage they receive is the error this ordering prevents.
 */
async function buildLine(input: LineInput) {
	const { product, dealer, override } = await specFor(input.productId, input.dealerId)

	if (!product || !product.isActive) {
		throw new OrderError("That product is not available to order.", "PRODUCT_UNAVAILABLE")
	}
	if (!product.listPrice) {
		throw new OrderError("That product has no price set yet.", "NO_PRICE")
	}

	const lfPerStick = product.conversions.find(
		(c) => c.fromUom === "STICK" && c.toUom === "LF",
	)?.factor
	const sticksPerBundle = product.conversions.find(
		(c) => c.fromUom === "BUNDLE" && c.toUom === "STICK",
	)?.factor

	const conversion = resolveUom(
		{
			pricingUom: product.pricingUom,
			orderUoms: product.orderUoms,
			sqFtPerBox:
				product.sqFtPerBoxOverride?.toString() ?? product.series.sqFtPerBox?.toString(),
			boxesPerPallet: product.boxesPerPalletOverride ?? product.series.boxesPerPallet ?? undefined,
			lbPerBox: product.series.lbPerBox?.toString(),
			lfPerStick: lfPerStick?.toString(),
			sticksPerBundle: sticksPerBundle ? Number(sticksPerBundle) : undefined,
		},
		input.unit,
		input.quantity,
		input.wasteFactorPct ?? 0,
	)

	const price = resolvePrice(
		{ listPrice: product.listPrice.toString(), pricingUom: product.pricingUom },
		{
			discountPct: dealer?.discountPct?.toString(),
			tierDiscountPct: dealer?.priceTier?.discountPct.toString(),
		},
		{ price: override?.price?.toString(), discountPct: override?.discountPct?.toString() },
	)

	return {
		product,
		conversion,
		price,
		total: lineTotal(price.unitPrice, conversion.billableQty),
	}
}

export async function addLine(input: LineInput) {
	const orderId = await getOrCreateDraft(input.dealerId)
	const { product, conversion, price, total } = await buildLine(input)

	const count = await db.orderItem.count({ where: { orderId } })

	await db.orderItem.create({
		data: {
			orderId,
			productId: product.id,
			unitSelected: input.unit,
			qtyEntered: input.quantity,
			qtyBase: conversion.sellableQty.toString(),
			uomBase: conversion.sellableUom,
			boxes: conversion.boxes ?? null,
			sqFt: conversion.coverageSqFt?.toString() ?? null,
			weightLb: conversion.weightLb?.toString() ?? null,
			unitPrice: price.unitPrice.toString(),
			lineTotal: total.toString(),
			// Snapshotted so an order still reads correctly if the product is
			// renamed or the SKU scheme changes later.
			productNameSnapshot: product.name,
			productSkuSnapshot: product.sku,
			sortOrder: count,
		},
	})

	await recalculate(orderId)
	return orderId
}

export async function updateLine(
	dealerId: string,
	itemId: string,
	unit: Uom,
	quantity: string,
	wasteFactorPct = 0,
) {
	const item = await db.orderItem.findFirst({
		// Scoped through the order to the dealer: an item id on its own is not
		// proof that this dealer is allowed to touch it.
		where: { id: itemId, order: { dealerId, status: "DRAFT" } },
		select: { id: true, orderId: true, productId: true },
	})
	if (!item) throw new OrderError("That line is not on your order.", "NOT_FOUND")

	const { conversion, price, total } = await buildLine({
		dealerId,
		productId: item.productId,
		unit,
		quantity,
		wasteFactorPct,
	})

	await db.orderItem.update({
		where: { id: item.id },
		data: {
			unitSelected: unit,
			qtyEntered: quantity,
			qtyBase: conversion.sellableQty.toString(),
			uomBase: conversion.sellableUom,
			boxes: conversion.boxes ?? null,
			sqFt: conversion.coverageSqFt?.toString() ?? null,
			weightLb: conversion.weightLb?.toString() ?? null,
			unitPrice: price.unitPrice.toString(),
			lineTotal: total.toString(),
		},
	})

	await recalculate(item.orderId)
	return item.orderId
}

export async function removeLine(dealerId: string, itemId: string) {
	const item = await db.orderItem.findFirst({
		where: { id: itemId, order: { dealerId, status: "DRAFT" } },
		select: { id: true, orderId: true },
	})
	if (!item) throw new OrderError("That line is not on your order.", "NOT_FOUND")

	await db.orderItem.delete({ where: { id: item.id } })
	await recalculate(item.orderId)
	return item.orderId
}

/**
 * Re-adds the order up.
 *
 * Weight and pallet count are totalled here as well as money, because freight
 * is quoted on the shipment rather than the line and the figures have to exist
 * before anything can quote it.
 */
export async function recalculate(orderId: string) {
	const items = await db.orderItem.findMany({
		where: { orderId },
		select: { lineTotal: true, weightLb: true, boxes: true, productId: true },
	})

	const subtotal = sumLines(items.map((item) => item.lineTotal.toString()))

	const weight = items.reduce<Decimal>(
		(sum, item) => sum.plus(item.weightLb?.toString() ?? 0),
		new Decimal(0),
	)

	// Pallet count needs boxes-per-pallet, which is per series — so it is worked
	// out per product and then rounded up once, not per line.
	const boxesByProduct = new Map<string, number>()
	for (const item of items) {
		if (item.boxes) {
			boxesByProduct.set(item.productId, (boxesByProduct.get(item.productId) ?? 0) + item.boxes)
		}
	}

	let pallets = new Decimal(0)
	if (boxesByProduct.size > 0) {
		const products = await db.product.findMany({
			where: { id: { in: [...boxesByProduct.keys()] } },
			select: {
				id: true,
				boxesPerPalletOverride: true,
				series: { select: { boxesPerPallet: true } },
			},
		})
		for (const product of products) {
			const perPallet = product.boxesPerPalletOverride ?? product.series.boxesPerPallet
			if (!perPallet) continue
			pallets = pallets.plus(
				new Decimal(boxesByProduct.get(product.id) ?? 0).dividedBy(perPallet),
			)
		}
	}

	const order = await db.order.findUnique({
		where: { id: orderId },
		select: { freight: true, tax: true },
	})

	const total = subtotal
		.plus(order?.freight?.toString() ?? 0)
		.plus(order?.tax?.toString() ?? 0)
		.toDecimalPlaces(2)

	await db.order.update({
		where: { id: orderId },
		data: {
			subtotal: subtotal.toString(),
			total: total.toString(),
			totalWeightLb: weight.isZero() ? null : weight.toDecimalPlaces(2).toString(),
			palletCount: pallets.isZero()
				? null
				: pallets.toDecimalPlaces(0, Decimal.ROUND_CEIL).toNumber(),
		},
	})
}

/** How many lines are on the cart, for the header badge. */
export async function countDraftLines(dealerId: string): Promise<number> {
	const draft = await db.order.findFirst({
		where: { dealerId, status: "DRAFT" },
		select: { _count: { select: { items: true } } },
	})
	return draft?._count.items ?? 0
}
