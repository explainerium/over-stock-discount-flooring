import "dotenv/config"
import { defineConfig } from "prisma/config"

/**
 * Two connection strings, deliberately.
 *
 * DATABASE_URL goes through the pooler and is what the running app uses —
 * serverless opens a connection per invocation, and without a pooler that
 * exhausts max_connections under trivial load.
 *
 * DIRECT_URL bypasses the pooler for migrations, which need a real session and
 * cannot run through PgBouncer in transaction mode. It falls back to
 * DATABASE_URL so a plain local Postgres works with one variable set.
 */
export default defineConfig({
	schema: "prisma/schema.prisma",
	migrations: {
		path: "prisma/migrations",
		seed: "tsx prisma/seed.ts",
	},
	datasource: {
		url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
		shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"],
	},
})
