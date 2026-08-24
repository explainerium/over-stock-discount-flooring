import { requireDealerScope } from "@/server/auth/guards"
import { listAddresses } from "@/server/repositories/addresses"
import { AddressBook } from "./_components/AddressBook"

export const metadata = { title: "Delivery Addresses" }

/**
 * Where a dealer's orders can go.
 *
 * Kept as its own screen rather than a step inside the order, because the same
 * places are used over and over — a dealer's warehouse plus whichever jobsites
 * are live — and re-typing an address on every order is how the wrong ZIP gets
 * onto a freight quote.
 */
export default async function AddressesPage() {
	const { dealerId, user } = await requireDealerScope()
	const addresses = await listAddresses(dealerId)

	return (
		<div className="grid max-w-3xl gap-6">
			<div>
				<h1 className="text-xl font-semibold tracking-wide uppercase">
					Delivery Addresses
				</h1>
				<p className="text-muted-foreground text-sm">
					{addresses.length === 0
						? "Add the first place we should deliver to."
						: `${addresses.length} on file · ${user.dealerName}`}
				</p>
			</div>

			<AddressBook addresses={addresses} />
		</div>
	)
}
