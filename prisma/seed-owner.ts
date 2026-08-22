import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"
import { hashPassword } from "../src/server/auth/password"

/**
 * Creates the owner account.
 *
 * Separate from the catalogue seed because it is needed now, while product data
 * is still being confirmed. Run with:
 *
 *   npm run db:seed:owner -- owner@example.com "some long password"
 */

const prisma = new PrismaClient({
	adapter: new PrismaPg({
		connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
	}),
})

async function main() {
	const [email, password] = process.argv.slice(2)

	if (!email || !password) {
		console.error('Usage: npm run db:seed:owner -- <email> "<password>"')
		process.exit(1)
	}
	if (password.length < 12) {
		console.error("Password must be at least 12 characters.")
		process.exit(1)
	}

	const passwordHash = await hashPassword(password)

	const user = await prisma.user.upsert({
		where: { email: email.toLowerCase() },
		update: { passwordHash, role: "OWNER", status: "ACTIVE" },
		create: {
			email: email.toLowerCase(),
			passwordHash,
			role: "OWNER",
			status: "ACTIVE",
			firstName: "Owner",
		},
	})

	console.log(`Owner account ready: ${user.email}`)
}

main()
	.then(() => prisma.$disconnect())
	.catch(async (error) => {
		console.error(error)
		await prisma.$disconnect()
		process.exit(1)
	})
