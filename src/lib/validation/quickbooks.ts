import { z } from "zod"

/**
 * The QuickBooks item ids.
 *
 * Ids rather than names, because that is what the API takes and because two
 * items in a real chart of accounts can share a name. The owner reads them off
 * the URL in QuickBooks when he opens the item — there is no way for this site
 * to list them until it is connected, and asking him once is cheaper than
 * building a picker he uses twice.
 *
 * Digits only. Every QuickBooks entity id is numeric, so a pasted name or a
 * whole URL is caught here rather than by a rejected invoice on an order that
 * has already been approved.
 */
const itemId = (label: string) =>
	z
		.string()
		.trim()
		.regex(/^\d{1,20}$/, `${label} is the number QuickBooks shows for the item.`)

export const qboItemsSchema = z.object({
	goodsItemId: itemId("Goods item"),
	freightItemId: itemId("Freight item").optional().or(z.literal("")),
})

export type QboItemsInput = z.infer<typeof qboItemsSchema>
