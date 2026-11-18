import { describe, expect, it } from "vitest"
import { signParams } from "./sign"

describe("signParams", () => {
	// The worked example from Cloudinary's own signature documentation.
	it("matches Cloudinary's documented example", () => {
		expect(
			signParams(
				{
					timestamp: 1315060510,
					public_id: "sample_image",
					eager: "w_400,h_300,c_pad|w_260,h_200,c_crop",
				},
				"abcd",
			),
		).toBe("bfd09f95f331f558cbd1320e67aa8d488770583e")
	})

	it("does not depend on the order the parameters were written in", () => {
		const a = signParams({ folder: "products", timestamp: 1 }, "s")
		const b = signParams({ timestamp: 1, folder: "products" }, "s")
		expect(a).toBe(b)
	})
})
