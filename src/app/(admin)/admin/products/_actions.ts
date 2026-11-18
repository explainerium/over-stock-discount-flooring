"use server"

import { revalidatePath } from "next/cache"
import {
	splitImages,
	blank,
	createCategorySchema,
	createProductSchema,
	hasPieceLength,
	seriesOrUndefined,
	slugify,
	updateCategorySchema,
	updateProductSchema,
	updateSeriesSchema,
	wholeOrUndefined,
	type CreateProductInput,
} from "@/lib/validation/catalog"
import type { ActionResult } from "@/lib/validation/dealers"
import { requireStaff } from "@/server/auth/guards"
import { signProductUpload, type SignedUpload } from "@/server/integrations/cloudinary"
import { audit } from "@/server/repositories/audit"
import {
	createCategory,
	createProduct,
	findConflicting,
	findConflictingCategory,
	getCategory,
	setProductAccess,
	updateCategory,
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

/** A category id from a form is checked, not trusted to the foreign key. */
async function categoryExists(categoryId: string): Promise<boolean> {
	return Boolean(await getCategory(categoryId))
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

	if (!(await categoryExists(data.categoryId))) {
		return { ok: false, message: "That category no longer exists.", field: "categoryId" }
	}

	const product = await createProduct({
		name: data.name,
		slug,
		sku: data.sku,
		categoryId: data.categoryId,
		seriesId: seriesOrUndefined(data.seriesId),
		soldBy: data.soldBy,
		lfPerPiece: hasPieceLength(data.lfPerPiece) ? data.lfPerPiece.trim() : undefined,
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

	if (!(await categoryExists(data.categoryId))) {
		return { ok: false, message: "That category no longer exists.", field: "categoryId" }
	}

	const product = await updateProduct(data.id, {
		name: data.name,
		sku: data.sku,
		categoryId: data.categoryId,
		seriesId: seriesOrUndefined(data.seriesId),
		designName: blank(data.designName),
		description: blank(data.description),
		listPrice: blank(data.listPrice),
		pricingUom: data.pricingUom,
		orderUoms: data.orderUoms,
		stockStatus: data.stockStatus,
		isPublic: data.isPublic,
		isActive: data.isActive,
		images: splitImages(data.images),
		dealerRestricted: data.dealerRestricted,
		lfPerPiece: hasPieceLength(data.lfPerPiece) ? data.lfPerPiece.trim() : undefined,
	})

	// Written whatever the flag says — see setProductAccess.
	await setProductAccess(data.id, data.dealerIds)

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

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function createCategoryAction(input: unknown): Promise<ActionResult<{ id: string }>> {
	const staff = await requireStaff()

	const parsed = createCategorySchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}
	const data = parsed.data
	const slug = slugify(data.name)

	if (!slug) {
		return { ok: false, message: "That name has no letters or numbers in it.", field: "name" }
	}
	if (await findConflictingCategory(data.name, slug)) {
		return { ok: false, message: "A category with that name already exists.", field: "name" }
	}

	const category = await createCategory({
		name: data.name,
		slug,
		blurb: blank(data.blurb),
		sortOrder: wholeOrUndefined(data.sortOrder) ?? 0,
	})

	await audit({
		entity: "Category",
		entityId: category.id,
		action: "created",
		actorId: staff.id,
		after: { name: category.name, slug: category.slug },
	})

	revalidatePath("/admin/categories")
	revalidateCatalog()
	return { ok: true, data: { id: category.id } }
}

export async function updateCategoryAction(input: unknown): Promise<ActionResult> {
	const staff = await requireStaff()

	const parsed = updateCategorySchema.safeParse(input)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return { ok: false, message: issue.message, field: issue.path[0]?.toString() }
	}
	const data = parsed.data

	const current = await getCategory(data.id)
	if (!current) return { ok: false, message: "That category no longer exists." }

	// The slug stays put (see updateCategory), so only the name can clash.
	if (await findConflictingCategory(data.name, current.slug, data.id)) {
		return { ok: false, message: "A category with that name already exists.", field: "name" }
	}

	const category = await updateCategory(data.id, {
		name: data.name,
		blurb: blank(data.blurb),
		sortOrder: wholeOrUndefined(data.sortOrder) ?? 0,
		isActive: data.isActive,
	})

	await audit({
		entity: "Category",
		entityId: data.id,
		action: "updated",
		actorId: staff.id,
		after: { name: category.name, isActive: data.isActive },
	})

	revalidatePath("/admin/categories")
	revalidateCatalog()
	return { ok: true, message: "Saved." }
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

/**
 * Permission for the browser to upload one photo to Cloudinary.
 *
 * Staff only, because the signature is what stands between the client's media
 * library and anyone who finds the upload URL.
 */
export async function signImageUploadAction(): Promise<ActionResult<SignedUpload>> {
	await requireStaff()

	const signed = signProductUpload()
	if (!signed) {
		return {
			ok: false,
			message: "Photo uploads are not set up yet: the Cloudinary keys are missing.",
		}
	}
	return { ok: true, data: signed }
}
