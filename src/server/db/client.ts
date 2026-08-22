import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@/generated/prisma/client"

/**
 * The Prisma client, as a singleton.
 *
 * Two separate reasons it has to be one instance rather than a fresh client per
 * import:
 *
 *   - In development, hot reload re-evaluates modules on every edit. A client
 *     constructed at module scope would open a new connection pool each time
 *     and exhaust the database's connection limit within a few saves.
 *   - In production the app runs serverless, where each invocation gets its own
 *     process anyway. Holding one client per process is what lets the pool
 *     survive between requests that land on a warm instance.
 *
 * Prisma 7 requires a driver adapter — the connection string is handed to
 * `PrismaPg` rather than read out of the schema, which is also why the pooled
 * URL belongs here and the direct one stays in prisma.config.ts for migrations.
 */

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
	throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.")
}

const createClient = () =>
	new PrismaClient({
		adapter: new PrismaPg({ connectionString }),
		log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
	})

const globalForPrisma = globalThis as unknown as {
	prisma?: ReturnType<typeof createClient>
}

export const db = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== "production") {
	globalForPrisma.prisma = db
}
