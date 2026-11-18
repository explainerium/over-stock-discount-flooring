import { describe, expect, it } from "vitest"
import cloudinaryLoader from "./cloudinary-loader"

const upload = "https://res.cloudinary.com/demo/image/upload/v1712/products/oak.jpg"

describe("cloudinaryLoader", () => {
	it("puts width, format and quality into a Cloudinary URL", () => {
		expect(cloudinaryLoader({ src: upload, width: 640 })).toBe(
			"https://res.cloudinary.com/demo/image/upload/f_auto,c_limit,w_640,q_auto/v1712/products/oak.jpg",
		)
	})

	it("passes an explicit quality through", () => {
		expect(cloudinaryLoader({ src: upload, width: 320, quality: 60 })).toContain(
			"/upload/f_auto,c_limit,w_320,q_60/",
		)
	})

	it("leaves a file from public/ alone apart from a width hint", () => {
		expect(cloudinaryLoader({ src: "/swatches/oak.jpg", width: 640 })).toBe(
			"/swatches/oak.jpg?w=640",
		)
	})

	it("leaves any other remote URL untouched", () => {
		const url = "https://example.com/oak.jpg?sig=abc"
		expect(cloudinaryLoader({ src: url, width: 640 })).toBe(url)
	})
})
