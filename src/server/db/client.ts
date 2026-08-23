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

/**
 * Pool size, capped.
 *
 * With a Prisma 7 driver adapter the connection string goes straight to `pg`,
 * so `?connection_limit=` — a Prisma-only parameter — is ignored, and the pool
 * has to be bounded here instead. Left unbounded, `pg` defaults to ten per
 * client, and a Next build runs several worker processes each holding one:
 * enough to exhaust a local Postgres and take the build down with it.
 *
 * Small on purpose. Serverless gives each invocation its own process, so a
 * large per-process pool buys nothing and costs connections.
 */
const POOL_SIZE = Number(process.env.DATABASE_POOL_SIZE) || 3

const createClient = () =>
	new PrismaClient({
		adapter: new PrismaPg({ connectionString, max: POOL_SIZE }),
		log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
	})

const globalForPrisma = globalThis as unknown as {
	prisma?: ReturnType<typeof createClient>
}

export const db = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== "production") {
	globalForPrisma.prisma = db
}
