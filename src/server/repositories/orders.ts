import "server-only"
import Decimal from "decimal.js"
import { db } from "@/server/db/client"
import type { Prisma } from "@/generated/prisma/client"
import {
	DEALER_EDITABLE,
	STAFF_EDITABLE,
	canSubmit,
	type OrderStatus,
} from "@/server/domain/orders"
import { isQuotable } from "@/server/domain/addresses"
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
	wasteFactorPct: true,
	unitPrice: true,
	unitPriceAtSubmit: true,
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

	// Started at the dealer's usual place rather than blank. Most orders go
	// where the last one went, and a dealer with a single address should never
	// be asked to pick it.
	const usual = await db.address.findFirst({
		where: { dealerId, isActive: true, isDefault: true },
		select: { id: true },
	})

	const created = await db.order.create({
		data: { dealerId, status: "DRAFT", shipToAddressId: usual?.id ?? null },
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
			shipToAddress: {
				select: {
					id: true,
					label: true,
					line1: true,
					line2: true,
					city: true,
					state: true,
					zip: true,
					isResidential: true,
					needsLiftgate: true,
					limitedAccess: true,
					isActive: true,
				},
			},
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
async function productSpec(productId: string) {
	return db.product.findUnique({
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
			series: {
				select: { sqFtPerBox: true, boxesPerPallet: true, lbPerBox: true },
			},
		},
	})
}

type ProductSpec = NonNullable<Awaited<ReturnType<typeof productSpec>>>

/**
 * What actually ships, for one product and one quantity.
 *
 * Split away from pricing on purpose. The owner editing a quantity on a
 * submitted order needs the conversion and nothing else: routing him through
 * the pricing engine would re-resolve the price he had just overridden, and
 * would refuse the edit outright on a product he has since deactivated.
 */
function convert(product: ProductSpec, unit: Uom, quantity: string, wasteFactorPct = 0) {
	const lfPerStick = product.conversions.find(
		(c) => c.fromUom === "STICK" && c.toUom === "LF",
	)?.factor
	const sticksPerBundle = product.conversions.find(
		(c) => c.fromUom === "BUNDLE" && c.toUom === "STICK",
	)?.factor

	return resolveUom(
		{
			pricingUom: product.pricingUom,
			orderUoms: product.orderUoms,
			sqFtPerBox:
				product.sqFtPerBoxOverride?.toString() ?? product.series.sqFtPerBox?.toString(),
			boxesPerPallet:
				product.boxesPerPalletOverride ?? product.series.boxesPerPallet ?? undefined,
			lbPerBox: product.series.lbPerBox?.toString(),
			lfPerStick: lfPerStick?.toString(),
			sticksPerBundle: sticksPerBundle ? Number(sticksPerBundle) : undefined,
		},
		unit,
		quantity,
		wasteFactorPct,
	)
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
		readonly code:
			"PRODUCT_UNAVAILABLE" | "NO_PRICE" | "NOT_FOUND" | "NOT_SUBMITTABLE" | "STALE",
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
	const [product, dealer, override] = await Promise.all([
		productSpec(input.productId),
		db.dealer.findUnique({
			where: { id: input.dealerId },
			select: {
				discountPct: true,
				priceTier: { select: { discountPct: true } },
			},
		}),
		db.dealerPrice.findUnique({
			where: {
				dealerId_productId: {
					dealerId: input.dealerId,
					productId: input.productId,
				},
			},
			select: { price: true, discountPct: true },
		}),
	])

	if (!product || !product.isActive) {
		throw new OrderError("That product is not available to order.", "PRODUCT_UNAVAILABLE")
	}
	if (!product.listPrice) {
		throw new OrderError("That product has no price set yet.", "NO_PRICE")
	}

	const conversion = convert(product, input.unit, input.quantity, input.wasteFactorPct ?? 0)

	const price = resolvePrice(
		{ listPrice: product.listPrice.toString(), pricingUom: product.pricingUom },
		{
			discountPct: dealer?.discountPct?.toString(),
			tierDiscountPct: dealer?.priceTier?.discountPct.toString(),
		},
		{
			price: override?.price?.toString(),
			discountPct: override?.discountPct?.toString(),
		},
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
			// What the engine applied, not what was asked for — a box count
			// carries no allowance however the form was left.
			wasteFactorPct: conversion.wasteFactorPct,
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

export async function updateLine(params: {
	dealerId: string
	itemId: string
	unit: Uom
	quantity: string
	/** Omitted means "keep the allowance already on the line". */
	wasteFactorPct?: number
}) {
	const { dealerId, itemId, unit, quantity } = params

	const item = await db.orderItem.findFirst({
		// Scoped through the order to the dealer: an item id on its own is not
		// proof that this dealer is allowed to touch it. Which statuses count as
		// editable is the lifecycle's call, not this file's.
		where: {
			id: itemId,
			order: { dealerId, status: { in: [...DEALER_EDITABLE] } },
		},
		select: { id: true, orderId: true, productId: true, wasteFactorPct: true },
	})
	if (!item) throw new OrderError("That line is not on your order.", "NOT_FOUND")

	// Defaulting to zero here rather than to what is stored would quietly drop
	// the dealer's waste allowance the first time they corrected a quantity,
	// and ship them short of what they asked for.
	const waste = params.wasteFactorPct ?? item.wasteFactorPct

	const { conversion, price, total } = await buildLine({
		dealerId,
		productId: item.productId,
		unit,
		quantity,
		wasteFactorPct: waste,
	})

	await db.orderItem.update({
		where: { id: item.id },
		data: {
			unitSelected: unit,
			qtyEntered: quantity,
			wasteFactorPct: conversion.wasteFactorPct,
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
		where: {
			id: itemId,
			order: { dealerId, status: { in: [...DEALER_EDITABLE] } },
		},
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
			boxesByProduct.set(
				item.productId,
				(boxesByProduct.get(item.productId) ?? 0) + item.boxes,
			)
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

/**
 * Points the open order at one of the dealer's addresses.
 *
 * Scoped through the dealer on both sides — the order and the address — so an
 * address id in a request body cannot attach somebody else's warehouse to an
 * order.
 */
export async function setShipTo(dealerId: string, orderId: string, addressId: string) {
	const [order, address] = await Promise.all([
		db.order.findFirst({
			where: { id: orderId, dealerId, status: { in: [...DEALER_EDITABLE] } },
			select: { id: true },
		}),
		db.address.findFirst({
			where: { id: addressId, dealerId, isActive: true },
			select: { id: true },
		}),
	])

	if (!order) throw new OrderError("That order cannot be changed now.", "NOT_FOUND")
	if (!address) throw new OrderError("That address is not on your account.", "NOT_FOUND")

	await db.order.update({
		where: { id: order.id },
		data: { shipToAddressId: address.id },
	})

	return order.id
}

/** How many lines are on the cart, for the header badge. */
export async function countDraftLines(dealerId: string): Promise<number> {
	const draft = await db.order.findFirst({
		where: { dealerId, status: "DRAFT" },
		select: { _count: { select: { items: true } } },
	})
	return draft?._count.items ?? 0
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/**
 * Moves an order, and records that it moved.
 *
 * The history row is written in the same transaction as the status change, not
 * after it. A status that changed with no record of who changed it is the thing
 * the owner will be asked about six weeks later, and "the log write failed" is
 * not an answer anybody accepts.
 */
export async function transitionOrder(params: {
	orderId: string
	to: OrderStatus
	actorId: string
	note?: string | null
	/** Extra fields that belong with this particular move. Scalars only. */
	data?: Prisma.OrderUpdateManyMutationInput
}) {
	const order = await db.order.findUnique({
		where: { id: params.orderId },
		select: { id: true, status: true },
	})
	if (!order) throw new OrderError("That order does not exist.", "NOT_FOUND")

	await db.$transaction(async (tx) => {
		// Conditional on the status we checked against, not just on the id.
		// The owner approves on his phone while somebody rejects at the desk:
		// both passed the legality check a second ago, and without this the
		// second write walks an order out of a terminal state and files a
		// history row saying it came from a status it had already left.
		const moved = await tx.order.updateMany({
			where: { id: order.id, status: order.status },
			data: { status: params.to, ...params.data },
		})

		if (moved.count === 0) {
			throw new OrderError(
				"Somebody else moved this order while you had it open. Reload and take another look.",
				"STALE",
			)
		}

		await tx.orderStatusHistory.create({
			data: {
				orderId: order.id,
				fromStatus: order.status,
				toStatus: params.to,
				actorId: params.actorId,
				note: params.note ?? null,
			},
		})
	})

	return { from: order.status, to: params.to }
}

/**
 * Submits a draft.
 *
 * The submitted price is stamped onto every line here. The owner can edit an
 * order before approving it, so both figures have to survive: what the dealer
 * agreed to when they sent it, and what it became. Without the first, a changed
 * price is indistinguishable from the price always having been that.
 */
export async function submitOrder(params: {
	dealerId: string
	actorId: string
	notes?: string | null
	/**
	 * Which order. Omitted means the dealer's open cart; supplied means a
	 * specific one, which is how an order comes back after the owner has asked
	 * for changes.
	 */
	orderId?: string
}) {
	const { dealerId, actorId, notes } = params

	const order = await db.order.findFirst({
		where: params.orderId
			? { id: params.orderId, dealerId, status: { in: [...DEALER_EDITABLE] } }
			: { dealerId, status: "DRAFT" },
		select: {
			id: true,
			total: true,
			_count: { select: { items: true } },
			shipToAddress: {
				select: {
					id: true,
					label: true,
					line1: true,
					line2: true,
					city: true,
					state: true,
					zip: true,
					isResidential: true,
					needsLiftgate: true,
					limitedAccess: true,
				},
			},
		},
	})
	if (!order) throw new OrderError("You have no order to submit.", "NOT_FOUND")

	const fitness = canSubmit({
		lineCount: order._count.items,
		total: order.total.toString(),
		hasShipTo: order.shipToAddress != null,
	})
	if (!fitness.ok) throw new OrderError(fitness.reason!, "NOT_SUBMITTABLE")

	if (!isQuotable(order.shipToAddress!)) {
		throw new OrderError(
			"That address is missing a state or a ZIP we can rate freight on.",
			"NOT_SUBMITTABLE",
		)
	}

	// Re-stamped on every submit, resubmissions included. If the owner repriced
	// a line and the dealer is sending it back, the dealer is agreeing to the
	// new figure — leaving the old stamp in place would keep showing them a
	// difference they have already accepted.
	await db.$executeRaw`
		UPDATE "OrderItem" SET "unitPriceAtSubmit" = "unitPrice" WHERE "orderId" = ${order.id}
	`

	await transitionOrder({
		orderId: order.id,
		to: "SUBMITTED",
		actorId,
		note: notes ?? null,
		data: {
			submittedAt: new Date(),
			dealerNotes: notes ?? null,
			// Frozen for the same reason the unit price is. Freight gets quoted
			// against this place; editing or archiving the address afterwards
			// must not rewrite what the quote was based on.
			shipToSnapshot: order.shipToAddress!,
		},
	})

	return order.id
}

const orderDetailSelect = {
	id: true,
	orderNumber: true,
	status: true,
	subtotal: true,
	freight: true,
	tax: true,
	total: true,
	totalWeightLb: true,
	palletCount: true,
	dealerNotes: true,
	internalNotes: true,
	submittedAt: true,
	approvedAt: true,
	createdAt: true,
	dealer: { select: { id: true, companyName: true, paymentTerms: true } },
	shipToAddressId: true,
	shipToAddress: {
		select: {
			id: true,
			label: true,
			line1: true,
			line2: true,
			city: true,
			state: true,
			zip: true,
			isResidential: true,
			needsLiftgate: true,
			limitedAccess: true,
			isActive: true,
		},
	},
	shipToSnapshot: true,
	items: { select: lineSelect, orderBy: { sortOrder: "asc" } },
	history: {
		select: {
			id: true,
			fromStatus: true,
			toStatus: true,
			note: true,
			createdAt: true,
			actor: {
				select: { firstName: true, lastName: true, email: true, role: true },
			},
		},
		orderBy: { createdAt: "desc" },
	},
} as const

/** One order, scoped to its dealer. */
export async function getDealerOrder(dealerId: string, orderId: string) {
	return db.order.findFirst({
		where: { id: orderId, dealerId },
		select: orderDetailSelect,
	})
}

/** One order, for staff. No dealer scope — that is the privilege, and it is explicit. */
export async function getOrderForStaff(orderId: string) {
	return db.order.findUnique({
		where: { id: orderId },
		select: orderDetailSelect,
	})
}

export async function listDealerOrders(dealerId: string) {
	return db.order.findMany({
		where: { dealerId, status: { not: "DRAFT" } },
		select: {
			id: true,
			orderNumber: true,
			status: true,
			total: true,
			submittedAt: true,
			createdAt: true,
			_count: { select: { items: true } },
		},
		orderBy: { createdAt: "desc" },
	})
}

/**
 * The owner's queue.
 *
 * Awaiting approval first and oldest first within that — the order that has
 * been waiting longest is the one somebody is most likely about to ring about.
 */
export async function listOrdersForStaff(status?: OrderStatus) {
	return db.order.findMany({
		where: status ? { status } : { status: { not: "DRAFT" } },
		select: {
			id: true,
			orderNumber: true,
			status: true,
			total: true,
			submittedAt: true,
			createdAt: true,
			dealer: { select: { companyName: true } },
			_count: { select: { items: true } },
		},
		orderBy: [{ submittedAt: "asc" }],
	})
}

export async function countAwaitingApproval(): Promise<number> {
	return db.order.count({ where: { status: "SUBMITTED" } })
}

// ---------------------------------------------------------------------------
// Editing before approval
// ---------------------------------------------------------------------------

// Type aliases rather than interfaces: Prisma's InputJsonValue requires an
// implicit index signature, which TypeScript gives to an aliased object type
// and withholds from an interface. These go straight into the audit log.

/** A line as it stood, for the audit log. */
export type LineSnapshot = {
	sku: string
	qtyEntered: string
	boxes: number | null
	unitPrice: string
	lineTotal: string
}

function snapshot(item: {
	productSkuSnapshot: string
	qtyEntered: Decimal
	boxes: number | null
	unitPrice: Decimal
	lineTotal: Decimal
}): LineSnapshot {
	return {
		sku: item.productSkuSnapshot,
		qtyEntered: item.qtyEntered.toString(),
		boxes: item.boxes,
		unitPrice: item.unitPrice.toString(),
		lineTotal: item.lineTotal.toString(),
	}
}

/**
 * The owner changing a line before approving it.
 *
 * Two things move here, and they move independently. The quantity goes back
 * through the conversion engine so the box count and the weight stay true.
 * The unit price is taken as typed and is *not* re-resolved — re-resolving
 * would undo the edit the moment it was made, since the whole point is to
 * override what the dealer's tier works out to.
 *
 * `unitPriceAtSubmit` is deliberately left alone. It is the record of what the
 * dealer agreed to, and it stops being that the moment this function touches it.
 */
export async function staffUpdateLine(edit: {
	orderId: string
	itemId: string
	quantity: string
	unitPrice: string
}): Promise<{ before: LineSnapshot; after: LineSnapshot }> {
	const item = await db.orderItem.findFirst({
		where: {
			id: edit.itemId,
			orderId: edit.orderId,
			order: { status: { in: [...STAFF_EDITABLE] } },
		},
		select: {
			id: true,
			orderId: true,
			productId: true,
			unitSelected: true,
			wasteFactorPct: true,
			qtyEntered: true,
			boxes: true,
			unitPrice: true,
			lineTotal: true,
			productSkuSnapshot: true,
		},
	})
	if (!item) throw new OrderError("That line cannot be changed now.", "NOT_FOUND")

	const product = await productSpec(item.productId)
	if (!product) throw new OrderError("That product no longer exists.", "NOT_FOUND")

	const conversion = convert(product, item.unitSelected, edit.quantity, item.wasteFactorPct)
	const unitPrice = new Decimal(edit.unitPrice)
	const total = lineTotal(unitPrice, conversion.billableQty)

	const updated = await db.orderItem.update({
		where: { id: item.id },
		data: {
			qtyEntered: edit.quantity,
			qtyBase: conversion.sellableQty.toString(),
			uomBase: conversion.sellableUom,
			boxes: conversion.boxes ?? null,
			sqFt: conversion.coverageSqFt?.toString() ?? null,
			weightLb: conversion.weightLb?.toString() ?? null,
			unitPrice: unitPrice.toString(),
			lineTotal: total.toString(),
		},
		select: {
			productSkuSnapshot: true,
			qtyEntered: true,
			boxes: true,
			unitPrice: true,
			lineTotal: true,
		},
	})

	await recalculate(item.orderId)
	return { before: snapshot(item), after: snapshot(updated) }
}

/** Taking a line off before approving — a product the owner cannot supply. */
export async function staffRemoveLine(orderId: string, itemId: string): Promise<LineSnapshot> {
	const item = await db.orderItem.findFirst({
		where: {
			id: itemId,
			orderId,
			order: { status: { in: [...STAFF_EDITABLE] } },
		},
		select: {
			id: true,
			productSkuSnapshot: true,
			qtyEntered: true,
			boxes: true,
			unitPrice: true,
			lineTotal: true,
		},
	})
	if (!item) throw new OrderError("That line cannot be changed now.", "NOT_FOUND")

	await db.orderItem.delete({ where: { id: item.id } })
	await recalculate(orderId)
	return snapshot(item)
}

export type OrderCharges = {
	freight: string
	tax: string
	internalNotes: string | null
}

/**
 * Freight, tax and the owner's own note.
 *
 * Freight is entered by hand for now. The plan has a rated engine behind a
 * carrier API later, but the owner quotes these himself today and an order
 * that cannot be approved until an integration exists is worse than a field.
 *
 * The write happens before the recalculation because `recalculate` reads
 * freight and tax back off the order to reach the total.
 */
export async function setOrderCharges(
	orderId: string,
	charges: { freight?: string; tax?: string; internalNotes?: string | null },
): Promise<{ before: OrderCharges; after: OrderCharges }> {
	const order = await db.order.findUnique({
		where: { id: orderId },
		select: {
			id: true,
			status: true,
			freight: true,
			tax: true,
			internalNotes: true,
		},
	})
	if (!order) throw new OrderError("That order does not exist.", "NOT_FOUND")
	if (!STAFF_EDITABLE.includes(order.status)) {
		throw new OrderError("This order can no longer be changed.", "NOT_FOUND")
	}

	const updated = await db.order.update({
		where: { id: order.id },
		data: {
			...(charges.freight !== undefined ? { freight: charges.freight } : {}),
			...(charges.tax !== undefined ? { tax: charges.tax } : {}),
			...(charges.internalNotes !== undefined
				? { internalNotes: charges.internalNotes }
				: {}),
			// Hand-entered until the rated engine lands. Recording where the
			// number came from is what makes that swap safe to make later.
			...(charges.freight !== undefined ? { freightSource: "MANUAL" as const } : {}),
		},
		select: { freight: true, tax: true, internalNotes: true },
	})

	await recalculate(order.id)

	return {
		before: {
			freight: order.freight.toString(),
			tax: order.tax.toString(),
			internalNotes: order.internalNotes,
		},
		after: {
			freight: updated.freight.toString(),
			tax: updated.tax.toString(),
			internalNotes: updated.internalNotes,
		},
	}
}
