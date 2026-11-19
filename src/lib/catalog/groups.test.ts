import { describe, expect, it } from "vitest"
import { groupByWearLayer } from "./groups"

const floor = (name: string, mil: number | null) => ({
	name,
	category: { slug: "flooring", name: "Flooring" },
	series: { wearLayerMil: mil, sqFtPerBox: "23.64" },
})
const shelf = (name: string, slug: string, title: string) => ({
	name,
	category: { slug, name: title },
	series: null,
})

describe("groupByWearLayer", () => {
	it("puts flooring under its wear layer, thinnest first, then the other shelves", () => {
		const groups = groupByWearLayer([
			floor("Nightfall Hills", 20),
			floor("Lake Lanier", 22),
			floor("Laurel Springs", 12),
			floor("Coastal Dunes", 28),
			floor("West Cliffe", 20),
			shelf("Quarter Round", "trim-moldings", "Trim & Moldings"),
			shelf("Stair Risers", "stair-products", "Stair Products"),
		])

		expect(groups.map((g) => g.title)).toEqual([
			"12 Mil Wear Layer",
			"20 Mil Wear Layer",
			"22 Mil Wear Layer",
			"28 Mil Wear Layer",
			"Trim & Moldings",
			"Stair Products",
		])
		// Two series at 20 mil sit together, in the order they arrived.
		expect(groups[1].products.map((p) => p.name)).toEqual(["Nightfall Hills", "West Cliffe"])
	})

	it("keeps flooring with no wear layer on file rather than dropping it", () => {
		const groups = groupByWearLayer([floor("Mystery", null), floor("Known", 20)])
		expect(groups.map((g) => g.title)).toEqual(["20 Mil Wear Layer", "Other Flooring"])
	})

	it("treats a series without square feet per box as not flooring", () => {
		const groups = groupByWearLayer([
			{
				category: { slug: "accessories", name: "Accessories" },
				series: { wearLayerMil: null, sqFtPerBox: null },
			},
		])
		expect(groups.map((g) => g.title)).toEqual(["Accessories"])
	})
})
