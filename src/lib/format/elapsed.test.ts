import { describe, expect, it } from "vitest"
import { agoLabel, isOverdue, waitingFor } from "./elapsed"

const NOW = new Date("2026-08-24T12:00:00Z")
const ago = (ms: number) => new Date(NOW.getTime() - ms)

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

describe("how long something has been waiting", () => {
	it("changes unit at each boundary rather than one step late", () => {
		// The off-by-one lives here: 60 minutes reading "60 min" and 24 hours
		// reading "24 hours" is what makes a queue look wrong.
		expect(waitingFor(ago(59 * MIN), NOW)).toBe("59 min")
		expect(waitingFor(ago(HOUR), NOW)).toBe("1 hour")
		expect(waitingFor(ago(23 * HOUR), NOW)).toBe("23 hours")
		expect(waitingFor(ago(DAY), NOW)).toBe("1 day")
		expect(waitingFor(ago(6 * DAY), NOW)).toBe("6 days")
		expect(waitingFor(ago(7 * DAY), NOW)).toBe("1 week")
	})

	it("says something for an order submitted a moment ago", () => {
		// Never blank, and never "0 min", which reads like a bug.
		expect(waitingFor(NOW, NOW)).toBe("just now")
		expect(waitingFor(ago(30_000), NOW)).toBe("just now")
	})

	it("keeps the singular from reading like a typo", () => {
		expect(waitingFor(ago(2 * HOUR), NOW)).toBe("2 hours")
		expect(waitingFor(ago(2 * DAY), NOW)).toBe("2 days")
		expect(waitingFor(ago(40 * DAY), NOW)).toBe("1 month")
	})
})

describe("overdue", () => {
	it("turns over after two days, not before", () => {
		// A dealer who submitted on Monday and has heard nothing by Wednesday
		// rings up. That is the moment worth marking.
		expect(isOverdue(ago(2 * DAY - MIN), NOW)).toBe(false)
		expect(isOverdue(ago(2 * DAY + MIN), NOW)).toBe(true)
	})
})

describe("phrasing a duration as a point in the past", () => {
	it("appends ago to a measured duration", () => {
		expect(agoLabel(ago(3 * DAY), NOW)).toBe("3 days ago")
		expect(agoLabel(ago(HOUR), NOW)).toBe("1 hour ago")
	})

	it("leaves 'just now' alone, which is the whole reason it exists", () => {
		expect(agoLabel(NOW, NOW)).toBe("just now")
	})
})
