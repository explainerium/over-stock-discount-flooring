import { describe, expect, it } from "vitest"
import {
	TERMINAL,
	TRANSITIONS,
	canSubmit,
	canTransition,
	isEditable,
	transitionsFor,
	type OrderStatus,
} from "./lifecycle"

describe("what a dealer may do", () => {
	it("can submit a draft and resubmit after changes are asked for", () => {
		expect(canTransition("DRAFT", "SUBMITTED", "DEALER").ok).toBe(true)
		expect(canTransition("CHANGES_REQUESTED", "SUBMITTED", "DEALER").ok).toBe(true)
	})

	it("cannot approve their own order", () => {
		// "Nothing proceeds until we approve" — so there must be no route past
		// SUBMITTED that a dealer can take.
		const result = canTransition("SUBMITTED", "APPROVED", "DEALER")
		expect(result.ok).toBe(false)
		expect(result.reason).toMatch(/not yours/)
	})

	it("cannot move an order forward from any state after submitting", () => {
		const forward: OrderStatus[] = ["APPROVED", "INVOICED", "SHIPPED", "DELIVERED", "CLOSED"]
		for (const to of forward) {
			expect(canTransition("SUBMITTED", to, "DEALER").ok).toBe(false)
		}
	})

	it("can walk away from a draft but not from a submitted order", () => {
		expect(canTransition("DRAFT", "CANCELLED", "DEALER").ok).toBe(true)
		// Once it is with the owner, withdrawing it is a conversation, not a button.
		expect(canTransition("SUBMITTED", "CANCELLED", "DEALER").ok).toBe(false)
	})
})

describe("what staff may do", () => {
	it("has three answers to a submitted order", () => {
		const options = transitionsFor("SUBMITTED", "STAFF").map((t) => t.to)
		expect(options).toContain("APPROVED")
		expect(options).toContain("CHANGES_REQUESTED")
		expect(options).toContain("REJECTED")
	})

	it("must give a reason when refusing or asking for changes", () => {
		const reject = TRANSITIONS.find((t) => t.to === "REJECTED")
		const changes = TRANSITIONS.find((t) => t.to === "CHANGES_REQUESTED")
		// A rejection with no reason is a phone call the owner has to take later.
		expect(reject?.note).toBe("required")
		expect(changes?.note).toBe("required")
	})

	it("does not have to explain an approval", () => {
		const approve = TRANSITIONS.find((t) => t.from === "SUBMITTED" && t.to === "APPROVED")
		expect(approve?.note).toBe("optional")
	})
})

describe("dead ends", () => {
	it.each(TERMINAL)("nothing moves out of %s", (status) => {
		expect(transitionsFor(status, "STAFF")).toHaveLength(0)
		expect(transitionsFor(status, "DEALER")).toHaveLength(0)
	})

	it("says a terminal order cannot be changed, rather than naming the target", () => {
		const result = canTransition("CANCELLED", "APPROVED", "STAFF")
		expect(result.ok).toBe(false)
		expect(result.reason).toMatch(/cannot be changed/)
	})

	it("keeps rejected and cancelled as separate events", () => {
		// Same outcome, different reason — and the reason is what gets asked about.
		expect(TERMINAL).toContain("REJECTED")
		expect(TERMINAL).toContain("CANCELLED")
		expect(canTransition("SUBMITTED", "REJECTED", "STAFF").ok).toBe(true)
		expect(canTransition("SUBMITTED", "CANCELLED", "STAFF").ok).toBe(true)
	})
})

describe("editing", () => {
	it("lets the owner edit a submitted order — the client asked for exactly this", () => {
		expect(isEditable("SUBMITTED", "STAFF")).toBe(true)
	})

	it("stops the owner editing once it has been invoiced", () => {
		// Editing after invoicing puts the site and QuickBooks out of step with
		// no way to tell which one is right.
		expect(isEditable("APPROVED", "STAFF")).toBe(false)
		expect(isEditable("INVOICED", "STAFF")).toBe(false)
		expect(isEditable("SHIPPED", "STAFF")).toBe(false)
	})

	it("freezes the order for the dealer the moment it is submitted", () => {
		expect(isEditable("DRAFT", "DEALER")).toBe(true)
		expect(isEditable("CHANGES_REQUESTED", "DEALER")).toBe(true)
		expect(isEditable("SUBMITTED", "DEALER")).toBe(false)
	})
})

describe("fitness to submit", () => {
	it("refuses an empty order", () => {
		expect(canSubmit({ lineCount: 0, total: 0 }).reason).toMatch(/nothing on this order/)
	})

	it("refuses an order that adds up to nothing", () => {
		expect(canSubmit({ lineCount: 2, total: "0" }).reason).toMatch(/adds up to nothing/)
	})

	it("accepts a real one", () => {
		expect(canSubmit({ lineCount: 1, total: "2244.30" }).ok).toBe(true)
	})
})

describe("the table itself", () => {
	it("has no duplicate routes", () => {
		const seen = TRANSITIONS.map((t) => `${t.from}->${t.to}`)
		expect(new Set(seen).size).toBe(seen.length)
	})

	it("never lets an order move to itself", () => {
		expect(TRANSITIONS.every((t) => t.from !== t.to)).toBe(true)
		expect(canTransition("DRAFT", "DRAFT", "STAFF").ok).toBe(false)
	})

	it("leaves every non-terminal state with somewhere to go", () => {
		// A state with no exits and no terminal marking is an order stuck forever.
		const states = [...new Set(TRANSITIONS.map((t) => t.to))]
		for (const state of states) {
			if (TERMINAL.includes(state)) continue
			const exits = TRANSITIONS.filter((t) => t.from === state)
			expect(exits.length, `${state} has no way out`).toBeGreaterThan(0)
		}
	})
})
