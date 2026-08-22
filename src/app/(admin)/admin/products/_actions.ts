"use server"

import { revalidatePath } from "next/cache"
import {
	blank,
	createProductSchema,
	slugify,
	updateProductSchema,
	updateSeriesSchema,
	wholeOrUndefined,
	type CreateProductInput,
} from "@/lib/validation/catalog"
import type { ActionResult } from "@/lib/validation/dealers"
import { requireStaff } from "@/server/auth/guards"
import { audit } from "@/server/repositories/audit"
import {
	createProduct,
	findConflicting,
	updateProduct,
	updateSeries,
} from "@/server/repositories/catalog"

/**
 * Catalogue administration.
 *
 * Same shape as the dealer actions: check the caller, validate, call a
 * repository, write an audit line, revalidate. Nothing here calculates.
 */

/** Public pages read the catalogue, so a change has to clear their caches too. */
function revalidateCatalog(slug?: string) {
	revalidatePath("/admin/products")
	revalidatePath("/")
	revalidatePath("/products")
	if (slug) revalidatePath(`/products/${slug}`)
}

export async function createProductAction(
	input: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> {
	const staff = await requireStaff()

	const parsed = createProductSchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}
	const data: CreateProductInput = parsed.data
	const slug = slugify(data.name)

	if (!slug) {
		return { ok: false, message: "That name has no letters or numbers in it.", field: "name" }
	}

	const clash = await findConflicting(slug, data.sku)
	if (clash) {
		return clash.sku === data.sku
			? { ok: false, message: "That SKU is already in use.", field: "sku" }
			: { ok: false, message: "A product with that name already exists.", field: "name" }
	}

	const product = await createProduct({
		name: data.name,
		slug,
		sku: data.sku,
		seriesId: data.seriesId,
		imageUrl: blank(data.imageUrl),
	})

	await audit({
		entity: "Product",
		entityId: product.id,
		action: "created",
		actorId: staff.id,
		after: { name: product.name, sku: data.sku },
	})

	// Created unpublished. A new colour appearing on the public site the instant
	// it is typed is not what anyone wants — it goes live when he says so.
	revalidateCatalog()
	return { ok: true, data: { id: product.id, slug: product.slug } }
}

export async function updateProductAction(input: unknown): Promise<ActionResult> {
	const staff = await requireStaff()

	const parsed = updateProductSchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}
	const data = parsed.data

	const clash = await findConflicting(slugify(data.name), data.sku, data.id)
	if (clash) {
		return { ok: false, message: "That SKU is already in use.", field: "sku" }
	}

	const product = await updateProduct(data.id, {
		name: data.name,
		sku: data.sku,
		seriesId: data.seriesId,
		designName: blank(data.designName),
		description: blank(data.description),
		listPrice: blank(data.listPrice),
		pricingUom: data.pricingUom,
		orderUoms: data.orderUoms,
		stockStatus: data.stockStatus,
		isPublic: data.isPublic,
		isActive: data.isActive,
	})

	await audit({
		entity: "Product",
		entityId: data.id,
		action: "updated",
		actorId: staff.id,
		after: { name: product.name, isPublic: data.isPublic, stockStatus: data.stockStatus },
	})

	revalidateCatalog()
	return { ok: true, message: "Saved." }
}

export async function updateSeriesAction(input: unknown): Promise<ActionResult> {
	const staff = await requireStaff()

	const parsed = updateSeriesSchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}
	const data = parsed.data

	const series = await updateSeries(data.id, {
		name: data.name,
		blurb: blank(data.blurb),
		lengthIn: blank(data.lengthIn),
		widthIn: blank(data.widthIn),
		thicknessMm: blank(data.thicknessMm),
		wearLayerMil: wholeOrUndefined(data.wearLayerMil),
		finishing: blank(data.finishing),
		edgeProfile: blank(data.edgeProfile),
		sqFtPerBox: blank(data.sqFtPerBox),
		boxesPerPallet: wholeOrUndefined(data.boxesPerPallet),
		lbPerBox: blank(data.lbPerBox),
		lbPerPallet: blank(data.lbPerPallet),
		palletsPerFtl: wholeOrUndefined(data.palletsPerFtl),
		freightClass: blank(data.freightClass),
		nmfcCode: blank(data.nmfcCode),
		isActive: data.isActive,
	})

	// Specs live on the series, so one edit here moves every colour under it —
	// which is the point, and also why it is worth logging.
	await audit({
		entity: "Series",
		entityId: data.id,
		action: "updated",
		actorId: staff.id,
		after: {
			name: series.name,
			sqFtPerBox: data.sqFtPerBox,
			boxesPerPallet: data.boxesPerPallet,
		},
	})

	revalidatePath("/admin/series")
	revalidateCatalog()
	return { ok: true, message: "Saved. Every colour in this series follows these specs." }
}
