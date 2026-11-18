import "server-only"
import { db } from "@/server/db/client"

/**
 * What the owner needs to see when he opens the site.
 *
 * The queries here cross entities, which is why they live together rather than
 * in the per-entity repositories: none of them is "list dealers" or "list
 * products", they are all "what is stuck".
 *
 * Only getDashboard is exported. The individual queries are its parts, and a
 * caller reaching for one of them alone would be building a second dashboard.
 *
 * Each one answers a question that otherwise arrives as a phone call. A dealer
 * with no delivery address cannot submit an order at all and has no way to know
 * that is why; a series with no freight class cannot be quoted; a product with
 * no price cannot be ordered. All three are silent until somebody complains.
 */

/**
 * Dealers who cannot order.
 *
 * Freight is quoted on a destination, so an active dealer with no address is a
 * dealer whose orders stop at the submit button. This is the newest way for an
 * account to be quietly unusable, and the owner is the only one who can ring
 * them about it.
 */
async function dealersWithoutAddress() {
	return db.dealer.findMany({
		where: { status: "ACTIVE", addresses: { none: { isActive: true } } },
		select: { id: true, companyName: true },
		orderBy: { companyName: "asc" },
	})
}

/** Accounts invited but never activated — an invite that went nowhere. */
async function dealersPending() {
	return db.dealer.findMany({
		where: { status: "PENDING" },
		select: { id: true, companyName: true, createdAt: true },
		orderBy: { createdAt: "asc" },
	})
}

/**
 * Products nobody can buy: no list price, and no price for any dealer either.
 *
 * The engine refuses to price those rather than quietly selling at zero, which
 * is the right behaviour and a poor discovery mechanism — the dealer meets it
 * as "not priced yet" in the catalogue. A product with no list price but a
 * price for some dealers is how the client works, so it is not counted.
 * A count, not a list: the overview only ever said how many.
 */
async function productsWithoutPrice() {
	return db.product.count({
		where: { isActive: true, listPrice: null, prices: { none: { price: { not: null } } } },
	})
}

/**
 * Series that cannot be shipped.
 *
 * A carrier needs a freight class and an NMFC code to rate an LTL shipment.
 * Missing them does not break anything today, because freight is entered by
 * hand — it breaks the moment rated quoting is switched on, and by then the
 * gap is eight weeks old.
 */
async function seriesMissingFreightData() {
	return db.series.findMany({
		// Flooring series only: a spec-less series has no boxes to ship.
		where: { sqFtPerBox: { not: null }, OR: [{ freightClass: null }, { nmfcCode: null }] },
		select: { id: true, name: true, freightClass: true, nmfcCode: true },
		orderBy: { sortOrder: "asc" },
	})
}

/** Orders that have been waiting longest, which is what the owner opens for. */
async function ordersAwaitingApproval(take = 8) {
	return db.order.findMany({
		where: { status: "SUBMITTED" },
		select: {
			id: true,
			orderNumber: true,
			total: true,
			submittedAt: true,
			freight: true,
			dealer: { select: { companyName: true } },
			_count: { select: { items: true } },
		},
		orderBy: { submittedAt: "asc" },
		take,
	})
}

/**
 * Everything the overview needs, in one round trip.
 *
 * Gathered here rather than in the page so the page stays a layout and the
 * pool sees one burst of queries instead of a waterfall.
 */
export async function getDashboard() {
	const [awaiting, noAddress, pending, noPrice, noFreightData, unhandledLeads, recentLeads] =
		await Promise.all([
			ordersAwaitingApproval(),
			dealersWithoutAddress(),
			dealersPending(),
			productsWithoutPrice(),
			seriesMissingFreightData(),
			db.lead.count({ where: { handledAt: null } }),
			db.lead.findMany({
				where: { handledAt: null },
				select: { id: true, source: true, name: true, company: true, createdAt: true },
				orderBy: { createdAt: "desc" },
				take: 4,
			}),
		])

	return { awaiting, noAddress, pending, noPrice, noFreightData, unhandledLeads, recentLeads }
}

/**
 * The dealer's own version of the same question.
 *
 * A dealer opens the portal to find out one of two things: what is happening
 * to an order they sent, or where they got to on one they had not sent yet.
 * The screen was a stub that told them their session was valid, which is the
 * one thing they already knew.
 *
 * Scoped by `dealerId` in every query rather than filtered afterwards — this
 * is pricing and order data, and the layout resolves the scope precisely so
 * pages below it cannot widen it by accident.
 */

/** Non-terminal orders: the ones still going somewhere. */
async function ordersInFlight(dealerId: string, take = 6) {
	return db.order.findMany({
		where: {
			dealerId,
			status: { notIn: ["DRAFT", "DELIVERED", "CLOSED", "REJECTED", "CANCELLED"] },
		},
		select: {
			id: true,
			orderNumber: true,
			status: true,
			total: true,
			submittedAt: true,
			createdAt: true,
			_count: { select: { items: true } },
		},
		orderBy: { submittedAt: "desc" },
		take,
	})
}

/** The last few that finished, so history is one glance rather than one click. */
async function ordersSettled(dealerId: string, take = 3) {
	return db.order.findMany({
		where: { dealerId, status: { in: ["DELIVERED", "CLOSED", "REJECTED", "CANCELLED"] } },
		select: {
			id: true,
			orderNumber: true,
			status: true,
			total: true,
			submittedAt: true,
			createdAt: true,
			_count: { select: { items: true } },
		},
		orderBy: { createdAt: "desc" },
		take,
	})
}

export async function getDealerDashboard(dealerId: string) {
	const [draft, inFlight, settled, addressCount, dealer] = await Promise.all([
		db.order.findFirst({
			where: { dealerId, status: "DRAFT" },
			select: {
				id: true,
				total: true,
				updatedAt: true,
				_count: { select: { items: true } },
			},
		}),
		ordersInFlight(dealerId),
		ordersSettled(dealerId),
		db.address.count({ where: { dealerId, isActive: true } }),
		db.dealer.findUnique({
			where: { id: dealerId },
			select: { minOrderValue: true },
		}),
	])

	return {
		draft,
		inFlight,
		settled,
		// Surfaced to the dealer for the same reason the owner's overview
		// surfaces it to him: without one the submit button refuses, and the
		// message only appears at the end of building a whole order.
		hasAddress: addressCount > 0,
		minOrderValue: dealer?.minOrderValue?.toString() ?? null,
	}
}
