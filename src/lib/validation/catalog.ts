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
 * Adding a colour: four fields.
 *
 * This is the shape of the answer to the client's own question — "if we added a
 * new product how hard would it be to put in the system". Specs, packaging and
 * freight class all come off the series and are never typed twice.
 */
export const createProductSchema = z.object({
	name: z.string().trim().min(1, "Name is required.").max(120),
	sku: z
		.string()
		.trim()
		.min(1, "SKU is required.")
		.max(40)
		.regex(/^[A-Za-z0-9._-]+$/, "SKU can use letters, numbers, dots, dashes and underscores."),
	seriesId: z.string().min(1, "Pick a series."),
	imageUrl: optionalText(500),
})

export const updateProductSchema = z.object({
	id: z.string().min(1),
	name: z.string().trim().min(1, "Name is required.").max(120),
	sku: z.string().trim().min(1, "SKU is required.").max(40),
	seriesId: z.string().min(1, "Pick a series."),
	/** Groups the same print film across formats — "Brookfield" in Gold and Gold W. */
	designName: optionalText(120),
	description: optionalText(4000),
	listPrice: decimalText("List price"),
	pricingUom: z.enum(["SQFT", "LF", "EACH", "ROLL"]),
	orderUoms: z
		.array(z.enum(["SQFT", "BOX", "PALLET", "LF", "STICK", "BUNDLE", "EACH", "ROLL"]))
		.min(1, "Pick at least one unit a dealer can order in."),
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
		.max(2000)
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

/**
 * Form-level schemas: the fields actually rendered, without the id.
 * See the note on inviteUserFormSchema — a resolver rejects an unregistered id
 * before the submit handler ever runs.
 */
export const updateProductFormSchema = updateProductSchema.omit({ id: true })
export const updateSeriesFormSchema = updateSeriesSchema.omit({ id: true })
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
