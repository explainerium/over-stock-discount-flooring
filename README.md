# Overstock Discount Flooring

A public catalogue and an invite-only dealer ordering portal for a rigid core
LVP wholesaler in High Point, North Carolina.

Nothing is bought on this site. A dealer builds an order, the owner approves or
edits it, and QuickBooks invoices it — so there is no checkout, no card
processing, and no wording anywhere that implies otherwise.

Replaces `overstockdiscountflooring.com`. See [CUTOVER.md](./CUTOVER.md) for how
that switch happens.

---

## Running it

```bash
npm install
cp .env.example .env     # then fill in DATABASE_URL and DIRECT_URL
npm run db:migrate       # schema
npm run db:seed          # the catalogue
npm run db:seed:owner    # an owner account to sign in with
npm run dev
```

`.env.example` documents every variable and what breaks when it is missing.
Almost everything is optional: with no mail provider, no Twilio and no
QuickBooks credentials the app runs and records what it would have sent.

| Command              | What it does                                        |
| -------------------- | --------------------------------------------------- |
| `npm run dev`        | Development server                                  |
| `npm run typecheck`  | `tsc --noEmit`                                      |
| `npm run lint`       | ESLint                                              |
| `npm test`           | Vitest — the pricing, UOM, freight and mail engines |
| `npm run format`     | Prettier                                            |
| `npm run db:migrate` | Create and apply a migration                        |
| `npm run db:deploy`  | Apply migrations only — this is the production one  |
| `npm run db:studio`  | Browse the database                                 |

Run `typecheck`, `lint` and `test` before committing. All three are quiet when
they pass.

---

## Stack

Next.js (App Router) · React · TypeScript · Prisma + PostgreSQL · Tailwind ·
shadcn/ui · Zod · react-hook-form · Vitest.

Auth is self-hosted — bcrypt and database sessions, no third-party identity
provider. Dealers arrive by invitation and set their own password; there is no
public sign-up.

Deployed on Vercel today and written to move to a VPS without a rewrite: nothing
host-specific lives outside `next.config.ts`, security headers are declared in
the framework rather than in `vercel.json`, and object storage is addressed as
S3-compatible rather than as one vendor's blob product.

---

## Layout

```
src/
  app/
    (marketing)/   public site — catalogue, product pages, calculator, leads
    (portal)/      dealer portal — pricing, cart, orders, addresses
    (admin)/       owner — orders, dealers, products, series, freight, leads
    (auth)/        login, invite, password reset
    api/cron/      scheduled jobs, behind a shared secret
  server/
    domain/        pure engines: uom, pricing, freight, orders, addresses
    repositories/  every database read and write
    integrations/  email, sms — provider behind an interface, sink as fallback
    notifications/ who hears about what
    jobs/          scheduled work, one registry
    auth/          sessions, guards, tokens
  components/
    form/          Pro* field kit over react-hook-form
    ui/            shadcn primitives
  lib/validation/  Zod schemas, shared by forms and server actions
  constants/       site, catalogue and the 301 redirect map
```

Four rules hold the shape together:

1. **`domain/` is pure.** No Prisma types, no `next/*`, no database. Plain values
   in and out, so the same engine runs in the cart, the admin editor, the public
   calculator and a test.
2. **Only repositories touch the database.** Pages and actions call them.
3. **A server action is a public endpoint.** Every one starts with a guard, and
   validates its input with the same schema the form used — being reachable only
   from a guarded page is not itself a guard.
4. **Every dealer-scoped query takes a `dealerId` explicitly.** An order fetched
   for the wrong dealer is one dealer's pricing handed to a competitor.

---

## Things worth knowing before changing something

- **Money is `decimal.js` everywhere and rounds in one place.** Line totals round
  to the cent in `domain/pricing`; nothing upstream of that rounds at all.
  Rounding early is how a portal total and a QuickBooks invoice end up a penny
  apart on a number a customer has already been sent.
- **Boxes round up, and the line is billed on what the boxes actually cover.**
  1,200 sq ft of a 23.64 sq ft box is 51 boxes and 1,205.64 sq ft. That is the
  client's own worked example and there are tests on it.
- **Freight is quoted from a zone table the owner maintains,** and is a returned
  result rather than an exception when it cannot be quoted — an order nobody can
  rate automatically is a designed outcome, not an error.
- **Mail and SMS never throw.** The action has already committed by the time they
  run; a slow API must not roll back an approved order.
- **Retire, do not delete.** Dealers, zones, addresses and products are
  deactivated, because each of them is part of the answer to why a past order
  cost what it did.

## Not finished

- **QuickBooks has never been run against a real company.** The OAuth flow,
  token handling, health check and invoice builder are written and unit-tested,
  and `QBO_ENVIRONMENT` defaults to `sandbox` so a misconfiguration cannot post
  to live books. Before it is trusted: connect a sandbox company, approve one
  order, and check the invoice against the order — particularly the tax, which
  is deliberately left to the customer record in QuickBooks rather than sent.
- **Live carrier rates (TQL) and sample ordering.** Both Phase 2.
- **Staging.** No staging deployment exists yet — see CUTOVER.md §3.
