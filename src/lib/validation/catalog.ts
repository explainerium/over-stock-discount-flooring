import { z } from "zod"

/**
 * Series and product schemas.
 *
 * Numbers arrive from a form as strings and stay strings all the way to
 * Postgres, where the column is `numeric`. Passing them through `Number()` on
 * the way would put every sq-ft-per-box figure through a float — which is the
 * one thing this project has been careful not to do anywhere else.
 */

const optionalText = (max: number) => z.string().trim().max(max).optional()

/** A decimal as typed. Validated by shape, never parsed into a float. */
const decimalText = (label: string) =>
	z
		.union([
			z.literal(""),
			z
				.string()
				.trim()
				.regex(/^\d+(\.\d+)?$/, `${label} must be a number.`),
		])
		.optional()

const wholeNumber = (label: string) =>
	z
		.union([
			z.literal(""),
			z.string().trim().regex(/^\d+$/, `${label} must be a whole number.`),
		])
		.optional()

/** `""` means "not provided", which the database stores as null. */
export function blank(value: string | undefined): string | undefined {
	const trimmed = value?.trim()
	return trimmed ? trimmed : undefined
}

export function wholeOrUndefined(value: string | undefined): number | undefined {
	const trimmed = blank(value)
	return trimmed === undefined ? undefined : Number.parseInt(trimmed, 10)
}

/**
 * The "no series" choice on a product form.
 *
 * A select cannot hold an empty string as an option value, so "not flooring"
 * travels as this word and becomes null on the way to the database.
 */
export const NO_SERIES = "none"

/** `NO_SERIES` or blank means the product has no series. */
export function seriesOrUndefined(value: string | undefined): string | undefined {
	const trimmed = blank(value)
	return trimmed === undefined || trimmed === NO_SERIES ? undefined : trimmed
}

/**
 * The units a non-flooring product can be sold by.
 *
 * Flooring is never chosen here: picking a series with square feet per box
 * makes a product flooring, priced per square foot and ordered by the box.
 *
 * PIECE is trim as the client sells it: "They're sold per piece. But people
 * like it to be priced per LF." Priced per linear foot, ordered in whole
 * pieces of a known length, billed on the feet those pieces add up to.
 */
export const SOLD_BY = ["EACH", "PIECE", "LF", "ROLL"] as const

/** How long one piece of trim is, in feet. Kept as typed, like every figure here. */
const pieceLength = decimalText("Length per piece")

/** A length that was given and is more than nothing. */
export function hasPieceLength(value: string | undefined): value is string {
	const trimmed = blank(value)
	return trimmed !== undefined && !/^0+(\.0+)?$/.test(trimmed)
}

/**
 * A piece length and ordering by the piece only make sense together.
 *
 * Ordering by the piece without a length leaves nothing to multiply out, and
 * the dealer would be told so at the cart rather than the owner here. A length
 * on something not priced per foot would be stored and never used.
 */
function checkPieceLength(
	data: { pricingUom: string; orderUoms: readonly string[]; lfPerPiece?: string },
	ctx: z.RefinementCtx,
) {
	const length = hasPieceLength(data.lfPerPiece)
	if (data.orderUoms.includes("STICK") && !length) {
		ctx.addIssue({
			code: "custom",
			path: ["lfPerPiece"],
			message: "Enter how long one piece is, so dealers can order by the piece.",
		})
	}
	if (length && data.pricingUom !== "LF") {
		ctx.addIssue({
			code: "custom",
			path: ["lfPerPiece"],
			message: "A piece length only applies to products priced per linear foot.",
		})
	}
}

/**
 * Adding a product.
 *
 * This is the shape of the answer to the client's own question — "if we added a
 * new product how hard would it be to put in the system". Flooring picks a
 * series and inherits every spec from it; anything else says what it is sold
 * by. Nothing is typed twice.
 */
export const createProductSchema = z
	.object({
		name: z.string().trim().min(1, "Name is required.").max(120),
		sku: z
			.string()
			.trim()
			.min(1, "SKU is required.")
			.max(40)
			.regex(
				/^[A-Za-z0-9._-]+$/,
				"SKU can use letters, numbers, dots, dashes and underscores.",
			),
		categoryId: z.string().min(1, "Pick a category."),
		seriesId: z.string(),
		soldBy: z.enum(SOLD_BY),
		lfPerPiece: pieceLength,
		imageUrl: optionalText(500),
	})
	.superRefine((data, ctx) => {
		if (
			seriesOrUndefined(data.seriesId) === undefined &&
			data.soldBy === "PIECE" &&
			!hasPieceLength(data.lfPerPiece)
		) {
			ctx.addIssue({
				code: "custom",
				path: ["lfPerPiece"],
				message: "Enter how long one piece is, in feet.",
			})
		}
	})

const updateProductFields = z.object({
	id: z.string().min(1),
	name: z.string().trim().min(1, "Name is required.").max(120),
	sku: z.string().trim().min(1, "SKU is required.").max(40),
	categoryId: z.string().min(1, "Pick a category."),
	seriesId: z.string(),
	/** Groups the same print film across formats — "Brookfield" in Gold and Gold W. */
	designName: optionalText(120),
	description: optionalText(4000),
	listPrice: decimalText("List price"),
	pricingUom: z.enum(["SQFT", "LF", "EACH", "ROLL"]),
	orderUoms: z
		.array(z.enum(["SQFT", "BOX", "PALLET", "LF", "STICK", "BUNDLE", "EACH", "ROLL"]))
		.min(1, "Pick at least one unit a dealer can order in."),
	/** Feet in one piece, for trim sold by the piece and priced per foot. */
	lfPerPiece: pieceLength,
	stockStatus: z.enum(["IN_STOCK", "LOW", "OUT", "SPECIAL_ORDER"]),
	isPublic: z.boolean(),
	isActive: z.boolean(),
	/**
	 * One URL a line.
	 *
	 * A product carries a list — the plan asks for a swatch and a room shot — and
	 * until now the only way to set any of them was the create form, which takes
	 * one. So a colour photographed after it was added could never get its
	 * picture, and one added with the wrong URL kept it forever.
	 *
	 * A textarea rather than a repeating field: these are pasted, not typed, and
	 * a line each is the shape somebody pasting them already has. It becomes an
	 * uploader the day there is somewhere to upload to.
	 *
	 * Required, and empty is a valid value. Optional would be worse than it
	 * sounds: a field the form failed to register would arrive as undefined,
	 * split to an empty list, and quietly clear every image on the product. This
	 * way that mistake is a validation error somebody can see.
	 */
	/**
	 * Who this is offered to.
	 *
	 * The client asked to "pick and choose what products dealers have access
	 * to". Off means every signed-in dealer sees it, which is what the portal
	 * did before this field existed and is the safe default for anything nobody
	 * has thought about.
	 *
	 * `dealerIds` is only read when the flag is on. It is sent either way so a
	 * list built up over months survives being toggled off and on again while
	 * somebody works out what they meant.
	 */
	dealerRestricted: z.boolean(),
	dealerIds: z.array(z.string().min(1)),
	images: z
		.string()
		.trim()
		.max(4000)
		.refine(
			(value) => splitImages(value).every((url) => /^(\/|https?:\/\/)/.test(url)),
			"Each line should be a path like /swatches/name.jpg, or a full https:// URL.",
		),
})

/** "a
b

c" becomes ["a", "b", "c"]. Blank lines are not images. */
export function splitImages(value: string): string[] {
	return value
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
}

/** A new series is just a name; its specs go on the edit screen it opens onto. */
export const createSeriesSchema = z.object({
	name: z.string().trim().min(1, "Name is required.").max(80),
})

export const updateSeriesSchema = z.object({
	id: z.string().min(1),
	name: z.string().trim().min(1, "Name is required.").max(80),
	blurb: optionalText(500),
	lengthIn: decimalText("Length"),
	widthIn: decimalText("Width"),
	thicknessMm: decimalText("Thickness"),
	wearLayerMil: wholeNumber("Wear layer"),
	finishing: optionalText(80),
	edgeProfile: optionalText(80),
	sqFtPerBox: decimalText("Sq ft per box"),
	boxesPerPallet: wholeNumber("Boxes per pallet"),
	lbPerBox: decimalText("Lb per box"),
	lbPerPallet: decimalText("Lb per pallet"),
	palletsPerFtl: wholeNumber("Pallets per truckload"),
	/** Not on the current site and not yet supplied. No LTL rate can be quoted without them. */
	freightClass: optionalText(20),
	nmfcCode: optionalText(20),
	isActive: z.boolean(),
})

/** Categories: a name, an optional line of copy, and a position. */
export const createCategorySchema = z.object({
	name: z.string().trim().min(1, "Name is required.").max(60),
	blurb: optionalText(300),
	sortOrder: wholeNumber("Position"),
})

export const updateCategorySchema = createCategorySchema.extend({
	id: z.string().min(1),
	isActive: z.boolean(),
})

/**
 * Form-level schemas: the fields actually rendered, without the id.
 * See the note on inviteUserFormSchema — a resolver rejects an unregistered id
 * before the submit handler ever runs.
 */
export const updateProductSchema = updateProductFields.superRefine(checkPieceLength)
// Refined after the omit: zod will not omit fields from a schema that already
// carries a refinement.
export const updateProductFormSchema = updateProductFields
	.omit({ id: true })
	.superRefine(checkPieceLength)
export const updateSeriesFormSchema = updateSeriesSchema.omit({ id: true })
export const updateCategoryFormSchema = updateCategorySchema.omit({ id: true })
export type UpdateCategoryFormInput = z.infer<typeof updateCategoryFormSchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type CreateSeriesInput = z.infer<typeof createSeriesSchema>
export type UpdateProductFormInput = z.infer<typeof updateProductFormSchema>
export type UpdateSeriesFormInput = z.infer<typeof updateSeriesFormSchema>

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type UpdateSeriesInput = z.infer<typeof updateSeriesSchema>

/** Lower-cased, hyphenated, and stripped of anything that would need escaping in a URL. */
export function slugify(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
}
