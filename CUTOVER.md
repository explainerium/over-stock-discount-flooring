# Cutover runbook

How this site replaces `overstockdiscountflooring.com` without a gap and without
losing the rankings the old one holds.

The old site stays up and serving throughout. Everything below is reversible
until the step marked **point of no return**, and even that is reversible inside
the DNS TTL if the TTL was lowered first — which is step 1 for exactly that
reason.

Read the whole thing before starting. It takes about ninety minutes on the day,
of which most is waiting for DNS.

---

## 1. Before the day

### From the client — none of this can be done for him

| Item                                                        | Blocks                       |
| ----------------------------------------------------------- | ---------------------------- |
| Registrar and DNS access, or the name of who holds it       | Everything below             |
| A mailbox on the business domain (`orders@…`)               | All order and invite mail    |
| SPF, DKIM and DMARC records at the registrar                | Mail landing in inboxes      |
| QuickBooks Online admin access + existing customer list     | Invoicing                    |
| Dealer list: company, contact, pricing, freight, tax status | Dealers being able to log in |
| Privacy Policy and Terms text                               | Footer links going back      |
| Confirmation the 2 PDFs on file are current                 | Warranty links being honest  |

A gmail.com address cannot send this mail. Resend and every other sender will
refuse it, and the messages that fail are the invite and password-reset links —
which are the only way a dealer gets into an account.

### Analytics baseline — do this weeks ahead, not on the day

The current site has no analytics of any kind. Install GA4 and Search Console on
**the current site** and let them collect for at least two weeks before cutover.

This is the one item on the list that cannot be done retroactively. Without it
there is no before to compare the after against, and "did the new site do
better" becomes a matter of opinion permanently.

### From us

- [ ] Staging deployed and reviewed by the client (§3)
- [ ] Production database created, migrated, seeded with real product data
- [ ] Every environment variable in §2 set on production
- [ ] DNS TTL lowered to 300s at least 48h ahead — see step 1

---

## 2. Environment variables

`.env.example` is the full list with a note on each. These are the ones that
change between staging and production, or that break something quietly when
left unset.

| Variable                          | Production value                        | If it is wrong                                                                    |
| --------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------- |
| `SITE_URL`                        | `https://overstockdiscountflooring.com` | Every canonical, sitemap URL, invite link and email link points at the wrong host |
| `DATABASE_URL` / `DIRECT_URL`     | Production Postgres                     | Staging writes into production, or the reverse                                    |
| `CRON_SECRET`                     | A fresh random string                   | Unset closes the cron endpoint entirely — the jobs never run                      |
| `GA_MEASUREMENT_ID`               | The GA4 property                        | No analytics on the new site                                                      |
| `EMAIL_API_KEY` / `EMAIL_FROM`    | Resend API key, verified domain address | Mail silently falls to the sink; invite links only exist in the log               |
| `EMAIL_ORDER_CC`                  | Optional                                | Superseded by Settings once the owner saves a value there                         |
| `TWILIO_*` / `OWNER_ALERT_NUMBER` | Optional                                | Owner alerts fall to the sink. Email still goes                                   |
| `QBO_*`                           | Live app credentials                    | `QBO_ENVIRONMENT` left at `sandbox` invoices a test company                       |
| `CLOUDINARY_*`                    | The client's Cloudinary keys            | Photos already saved still show; uploading new ones in admin is switched off      |

Set `SITE_URL` to the **apex** or the **www** host, whichever the redirect at
step 5 makes canonical. Both work; they must not disagree with each other.

---

## 3. Staging rehearsal

Staging is the same build against a separate database. It exists so the client
signs off on real content and so the cutover is a repeat rather than a first
attempt.

**Staging must not be indexed.** Set `SITE_URL` to the staging host so
`robots.txt` and the sitemap describe staging rather than production, and put an
access password on the deployment. A staging site that gets indexed competes
with the real one for the rankings this whole document exists to protect.

Walk the client through, on staging, in this order:

1. Home, catalog, a product page, Rigid Core, Resources, About, Contact
2. The coverage calculator, with his own worked example — 1200 sq ft
3. A dealer invite, accepted in a private window, ending at a working password
4. An order built as that dealer: square footage in, boxes out, freight estimate
5. The same order in admin: edit a line, set freight, approve
6. The mail that arrives at each step

Anything he wants changed is cheaper now than after step 6.

---

## 4. Cutover

Sequenced so that everything before the DNS change is invisible to the public,
and everything after it is verifiable within minutes.

**1. Lower the DNS TTL — at least 48 hours ahead.**
Set the A/CNAME records for the apex and `www` to a 300-second TTL. Do nothing
else. This is what makes step 6 reversible in five minutes instead of a day.

**2. Freeze content on the old site.**
Nothing published there after this point comes across. Tell the client plainly.

**3. Final data load.**
Run migrations against production, then load the real catalogue.

```bash
npm run db:deploy      # migrations only — never db:push against production
npm run db:seed        # only for a first load; it upserts, but check what it writes
npm run db:seed:owner  # the owner's own account
```

Verify in admin that the series specs, colours, prices and stock statuses match
the sheet before going further.

**4. Deploy production and smoke-test on the deployment URL.**
Still nothing public — the domain is still pointed at the old site. Run §5
against the `*.vercel.app` host.

**5. Add the domain to the deployment.**
Configure both the apex and `www`, and pick one as canonical — the host that
matches `SITE_URL`. The other 308s to it.

**6. Point DNS at the new deployment. — POINT OF NO RETURN**
Change the A/CNAME records. Propagation is bounded by the TTL from step 1.

**7. Verify against the live domain.** §5, again, all of it.

**8. Raise the TTL back to 3600s** once §5 passes and has stayed passing for a
few hours.

**9. Search Console.** Submit `https://<host>/sitemap.xml` on the property, and
use the URL inspector on the old `/prod_bronze.htm` to confirm Google sees the 308.

---

## 5. Verification

Run every one of these. They are ordered so that a failure in an early one
explains the later ones.

```bash
HOST=https://overstockdiscountflooring.com

# Pages answer, and the portal and admin send you to a login rather than in.
for p in / /products /rigid-core /resources /about /contact /become-a-dealer; do
  curl -s -o /dev/null -w "%{http_code}  $p\n" "$HOST$p"
done

# The ten old pages 308 to the right places.
for p in /index.htm /prod_bronze.htm /prod_silver_a.htm /prod_silver_w.htm \
         /prod_gold_a.htm /prod_gold_w.htm /prod_accessories.htm \
         /aboutus.htm /contactus.htm /rigidcore.htm; do
  curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}  $p\n" "$HOST$p"
done

# The ten old PDF URLs. Note the %20 — a literal space matches nothing.
for s in bronze silver-a silver-w gold-a gold-w; do
  curl -s -o /dev/null -w "%{http_code}  $s Warranty\n" "$HOST/upload/prod/$s/Warranty.pdf"
  curl -s -o /dev/null -w "%{http_code}  $s Install\n" "$HOST/upload/prod/$s/Installation%20Instruction.pdf"
done

# Wholesale pricing must never be crawlable. Both of these must say noindex.
curl -sI "$HOST/portal" | grep -i x-robots-tag
curl -sI "$HOST/admin"  | grep -i x-robots-tag

# Crawler files — the old site 404s on both of these.
curl -s "$HOST/robots.txt"
curl -s "$HOST/sitemap.xml" | head -20

# A shared link has a picture behind it.
curl -s "$HOST/" | grep -oE '<meta property="og:image"[^>]*>'
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" "$HOST/opengraph-image"

# Scheduled work is reachable and refuses anyone without the secret.
curl -s -o /dev/null -w "%{http_code} (expect 401)\n" "$HOST/api/cron/prune-credentials"
```

By hand, on a phone as well as a desktop:

- [ ] Sign in as a dealer, build an order, see a freight estimate, submit it
- [ ] The order arrives by email, and by text if Twilio is configured
- [ ] Approve it in admin; the dealer gets the approval
- [ ] A contact form submission lands in the lead inbox
- [ ] Google Analytics registers a real session
- [ ] The tab icon is the ODF mark and not the Next.js logo

---

## 6. Rollback

Before step 6: nothing to roll back. Stop.

After step 6, within the TTL: point the DNS records back at the old host. The
old site is untouched and still serving; the change is visible in about five
minutes.

After the TTL has expired and traffic has settled: rolling back costs whatever
orders were placed in between. Do not roll back for a cosmetic fault — fix
forward. Roll back only for something that stops dealers ordering or exposes
pricing publicly.

---

## 7. The first week

- Watch Search Console's coverage report. A rise in 404s means a URL nobody
  enumerated — add it to `src/constants/redirects.ts` and redeploy.
- Compare sessions and queries against the pre-cutover baseline. A dip in the
  first two weeks is normal; a dip still there at six weeks is not.
- Check the lead inbox daily until the client trusts it.
- Confirm the first `prune-credentials` run appears in the logs, and the first
  Monday `resale-cert-reminders` run.
