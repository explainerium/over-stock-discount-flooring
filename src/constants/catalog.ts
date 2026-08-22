/**
 * Catalogue facts used by the public site.
 *
 * Provisional. The client has not signed off the final product list — in
 * particular whether the two hidden "W" series are current, which would take
 * the range from 34 colours to 62. Everything here is read off the live site
 * and cross-checked, so it is accurate as of today rather than invented, but it
 * lives in one file precisely so the page does not have to be rewritten when
 * the real data lands in the database.
 *
 * Swatch images are the factory's own print films, which is what the material
 * actually looks like. They sit in `public/` for now; they belong in object
 * storage before launch.
 */

export interface SeriesSummary {
	slug: string
	name: string
	/** Bronze, Silver, Gold — the client's own ladder, used as the colour key. */
	tone: "bronze" | "silver" | "gold"
	wearLayerMil: number
	thicknessMm: string
	widthIn: string
	sqFtPerBox: number
	boxesPerPallet: number
	colourCount: number
	/** What actually separates this tier from the one below it. */
	claim: string
}

export const SERIES: SeriesSummary[] = [
	{
		slug: "bronze",
		name: "Bronze",
		tone: "bronze",
		wearLayerMil: 12,
		thicknessMm: "5",
		widthIn: "7.17",
		sqFtPerBox: 28.68,
		boxesPerPallet: 55,
		colourCount: 6,
		claim: "The widest plank we stock, and the most floor in a box.",
	},
	{
		slug: "silver",
		name: "Silver",
		tone: "silver",
		wearLayerMil: 12,
		thicknessMm: "5",
		widthIn: "7.09",
		sqFtPerBox: 23.64,
		boxesPerPallet: 55,
		colourCount: 7,
		claim: "Wood-embossed rather than random — a quieter, more even floor.",
	},
	{
		slug: "gold",
		name: "Gold",
		tone: "gold",
		wearLayerMil: 20,
		thicknessMm: "5",
		widthIn: "7.09",
		sqFtPerBox: 23.64,
		boxesPerPallet: 55,
		colourCount: 21,
		claim: "A 20 mil wear layer — rated for commercial floors, not just homes.",
	},
]

export interface Swatch {
	src: string
	name: string
	series: SeriesSummary["tone"]
}

const FILES: ReadonlyArray<[string, string, Swatch["series"]]> = [
	["bronze-avalon", "Avalon", "bronze"],
	["bronze-golden-coast", "Golden Coast", "bronze"],
	["bronze-harmony", "Harmony", "bronze"],
	["bronze-laurel-springs", "Laurel Springs", "bronze"],
	["bronze-redwood-falls", "Redwood Falls", "bronze"],
	["bronze-timber-lake", "Timber Lake", "bronze"],
	["silver-a-berkley-oak-se", "Berkley Oak SE", "silver"],
	["silver-a-cumberland-lite", "Cumberland Lite", "silver"],
	["silver-a-lighthouse-bay", "Lighthouse Bay", "silver"],
	["silver-a-mill-creek", "Mill Creek", "silver"],
	["silver-a-smokey-creek", "Smokey Creek", "silver"],
	["silver-a-sterling-oak", "Sterling Oak", "silver"],
	["silver-a-twilight", "Twilight", "silver"],
	["gold-a-brookfield", "Brookfield", "gold"],
	["gold-a-charleston", "Charleston", "gold"],
	["gold-a-classic-lodge", "Classic Lodge", "gold"],
	["gold-a-everstill-forest", "Everstill Forest", "gold"],
	["gold-a-fountain-hills", "Fountain Hills", "gold"],
	["gold-a-golden-pine", "Golden Pine", "gold"],
	["gold-a-houston", "Houston", "gold"],
	["gold-a-kaneohe-bay", "Kaneohe Bay", "gold"],
	["gold-a-lake-lanier", "Lake Lanier", "gold"],
	["gold-a-mesa", "Mesa", "gold"],
	["gold-a-natural-oak", "Natural Oak", "gold"],
	["gold-a-nightfall-hills", "Nightfall Hills", "gold"],
	["gold-a-northshire", "Northshire", "gold"],
	["gold-a-olympia", "Olympia", "gold"],
	["gold-a-petrified-forest", "Petrified Forest", "gold"],
	["gold-a-phoenix", "Phoenix", "gold"],
	["gold-a-placid-cabin", "Placid Cabin", "gold"],
	["gold-a-providence", "Providence", "gold"],
	["gold-a-river-view", "River View", "gold"],
	["gold-a-rock-creek", "Rock Creek", "gold"],
	["gold-a-vintage-cabin", "Vintage Cabin", "gold"],
]

const ALL: Swatch[] = FILES.map(([file, name, series]) => ({
	src: `/swatches/${file}.jpg`,
	name,
	series,
}))

/**
 * Catalogue order runs six browns, then seven greys, then twenty-one golds.
 * Laid out in a row that reads as three flat blocks of colour. Dealing one from
 * each series in turn spreads the tones the way a sample rack actually looks,
 * and it is deterministic, so the server and the client agree on the order.
 */
function interleave(swatches: Swatch[]): Swatch[] {
	const piles = (["bronze", "silver", "gold"] as const).map((tone) =>
		swatches.filter((swatch) => swatch.series === tone),
	)
	const out: Swatch[] = []
	for (let i = 0; out.length < swatches.length; i++) {
		for (const pile of piles) if (pile[i]) out.push(pile[i])
	}
	return out
}

export const SWATCHES: Swatch[] = interleave(ALL)

export const COLOUR_COUNT = SWATCHES.length

/** Verified against the live catalogue — see the project's content inventory. */
export const FACTS = {
	planksPerBoxGold: 10,
	sqFtPerPallet: 1300,
	lbPerPallet: 2230,
	palletsPerTruck: 19,
	checkpoints: 89,
	productionProcesses: 10,
} as const

export const SHOWROOM = {
	street: "908 Old Thomasville Rd",
	city: "High Point",
	state: "NC",
	zip: "27260",
	phone: "(843) 318-9675",
	phoneHref: "tel:8433189675",
	weekdays: "Mon–Fri 8:00–5:00",
	saturday: "Sat 8:00–12:00",
} as const
