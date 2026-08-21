/**
 * Database seed.
 *
 * Run with `npm run db:seed`.
 *
 * Intended contents once the schema exists: the five series and their verified
 * specs, the accessory lines, and one owner account. The product data is
 * already captured — see `content-inventory.md` §2 in the project docs. Note
 * the five spec groups (Bronze, Silver, Silver W, Gold, Gold W) differ on
 * sq ft/box and boxes/pallet, so they cannot share one row.
 */

async function main() {
	console.log("No seed data yet — schema is not defined.")
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
