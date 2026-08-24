/**
 * Addresses.
 *
 * Pure, like the other domain modules — no Prisma, no `next/*` — so the portal
 * can render an address preview client-side from the same code the server uses
 * to freeze one onto an order.
 *
 * An address here is a freight destination first and a postal address second.
 * That is why the accessorials travel with it: a jobsite and a dealer's own
 * warehouse are different prices for the same pallet, and the difference is a
 * property of the place rather than something to re-ask on every order.
 */

export interface AddressParts {
	label?: string | null
	line1: string
	line2?: string | null
	city: string
	state: string
	zip: string
	isResidential?: boolean
	needsLiftgate?: boolean
	limitedAccess?: boolean
}

/** "1420 Trinity Ave, Suite B, High Point, NC 27260" */
export function formatAddress(address: AddressParts): string {
	return [address.line1, address.line2, `${address.city}, ${address.state} ${address.zip}`]
		.filter(Boolean)
		.join(", ")
}

/** The same thing over several lines, for anywhere with the room. */
export function addressLines(address: AddressParts): string[] {
	return [
		address.line1,
		address.line2,
		`${address.city}, ${address.state} ${address.zip}`,
	].filter((line): line is string => Boolean(line))
}

/** What to call it in a list. Falls back to the street, never to "Address 3". */
export function addressName(address: AddressParts): string {
	return address.label?.trim() || address.line1
}

const ACCESSORIAL_LABELS = [
	["isResidential", "Residential"],
	["needsLiftgate", "Liftgate"],
	["limitedAccess", "Limited access"],
] as const

/**
 * The extras a carrier charges for, in the words a carrier uses.
 *
 * Shown wherever an address is shown, because these are the line items that
 * surprise people on a freight bill — routinely $100–200 together.
 */
export function accessorialsOf(address: AddressParts): string[] {
	return ACCESSORIAL_LABELS.filter(([key]) => address[key]).map(([, label]) => label)
}

/**
 * Whether freight can be quoted to this place at all.
 *
 * A carrier rates on the ZIP. Everything else on the address is for the driver;
 * without five digits there is no rate, which is why this is checked at
 * submission rather than discovered when the owner tries to price the order.
 */
export function isQuotable(address: AddressParts): boolean {
	return /^\d{5}(-\d{4})?$/.test(address.zip.trim()) && address.state.trim().length === 2
}
