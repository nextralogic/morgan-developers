# TODO

Open items from the code audit on 2026-10-03 and the security review on 2026-10-08.

## In progress

- [ ] **Email an alert for every new lead.** `supabase/functions/submit-lead` only logs each enquiry until Resend is set up, so new leads appear only in the admin dashboard. Decided 2026-10-07: send the alerts through Resend's free plan. Waiting on the Resend account. Then set the `RESEND_API_KEY`, `FROM_EMAIL` and `ADMIN_EMAIL` secrets; as of 2026-10-08 none of them is set.

## Housekeeping

- [ ] **Delete the old Sydney project (`ihvhkdfeicfemjurtham`) around 2026-10-17.** It is no longer needed: on 2026-10-03 a full comparison found Mumbai identical to it. Afterwards, remove Sydney's redirect URI and authorised domain from the Google Cloud OAuth client.
- [ ] **After every schema change, refresh the snapshot.** Apply the migration with `supabase db push`, then run `npm run db:snapshot` and commit `supabase/schema_snapshot.sql`. The script needs `pg_dump` 17 or newer (`brew install libpq`). Never edit the snapshot by hand.

## Security (from the 2026-10-08 review)

- [ ] **Roll out the enquiry-form CAPTCHA, in this order.** Enquiries now go through the `submit-lead` edge function, which checks a Cloudflare Turnstile token before saving. Until both keys are set, it runs without the check.
  1. ~~`supabase functions deploy submit-lead`.~~ Done 2026-10-08.
  2. ~~Push the site so the form calls `submit-lead`, and wait for Netlify to finish.~~ Done 2026-10-08.
  3. ~~`supabase db push` (`20261008150000_leads_only_through_submit_lead.sql`), then `npm run db:snapshot`.~~ Done 2026-10-08. A direct insert with the public key is now refused.
  4. ~~`supabase functions delete lead-notification`.~~ Done 2026-10-08.
  5. In Cloudflare, add a Turnstile widget for `morgandevelopers.com`. Set `VITE_TURNSTILE_SITE_KEY` in Netlify's environment and redeploy.
  6. Only then set the secret: `supabase secrets set TURNSTILE_SECRET_KEY=...`. Once it's set, enquiries without a valid token are refused.
  7. ~~Add Cloudflare Turnstile to the privacy policy (`src/lib/privacy-policy.ts`).~~ Done 2026-10-08, along with Resend.
- [ ] **Send one test lead after Resend is set up** and confirm exactly one email arrives.
- [ ] **Review the Supabase Auth settings** (dashboard → Authentication). The CLI can't read them, so they weren't part of the review.
  1. Email provider: "Confirm email" is on, so nobody can sign up with someone else's address.
  2. URL Configuration: the Site URL is `https://morgandevelopers.com`, and Redirect URLs list only our own domains, without broad wildcards. Google sign-in and password resets only redirect to these.
  3. Minimum password length: the forms ask for 6. Consider 8, and update the forms' `minLength` to match.
  4. Rate limits for sign-ups and emails are on (the default).
  5. Run the Security Advisor (Database → Advisors) once. On 2026-10-08 the same checks run by hand found nothing: every table has RLS, every function has a fixed `search_path`, and no write policy is always true.
- [ ] **Limit view counting per visitor IP.** `log_property_view` counts any published listing, so anyone can inflate a view count by sending a new session ID with each request. A per-IP limit needs the real client IP from PostgREST's `request.headers`. Verify which header Supabase sets before relying on it, because `x-forwarded-for` can be spoofed by the client.
- [ ] **Plan the major-version upgrades `npm audit fix` couldn't make.**
  - Tailwind 4 (`braces`/`micromatch` advisories, build-time only).
  - React Router 7 (backslash open redirect; not reachable while every link target is fixed or slugified).
  - Vitest 4 (`tinypool`, test runs only) and Vite 8 (`esbuild` dev server, `npm run dev` only).
- [ ] **Roll out the second review's fixes, in this order.**
  1. ~~`supabase db push` (`20261008160000_second_security_review_fixes.sql`), then `npm run db:snapshot`.~~ Done 2026-10-08, after a dry run against live (25 checks, rolled back).
  2. Push the site (the uploader now always makes file names the database accepts; the listing form gets length limits).
  3. `supabase functions delete sitemap`. The site's sitemap is `/sitemap.xml` on Netlify; the old Supabase function was public, unused and ran with the service role key.
- [ ] **Run a full Claude Security scan once Dynamic workflows are available** (`/config`). The 2026-10-08 review was done by hand, without its independent verification panel.

## Done

- [x] **Fixed the security review findings** (2026-10-08). Migrations `20261008120000`, `20261008130000` and `20261008140000` are live.
  - A lead sends at most one notification email (`leads.notified_at`), and public lead submissions can't preset status, notes or handler.
  - Lead fields have length limits (name 200, email 254, phone 40, budget 100, contact time 50, message 5000), enforced by the database and the enquiry form.
  - Owners can change photos and amenities only while a listing is a draft.
  - `property_public_id` can't be set ahead of the sequence or changed, so drafts can't block new listings.
  - `log_property_view` counts only published listings and takes the viewer from `auth.uid()`. `property_views` can't be written directly.
  - Uploads are capped at 1 MB per file and 50 MB per non-admin user.
  - `has_role` answers only for the signed-in caller.
  - Only moderators and admins can write `audit_logs`.
  - `netlify.toml` sends anti-framing, `nosniff` and `Referrer-Policy` headers. Confirmed on the live homepage, which passes through the SEO edge function.
  - `npm audit fix` moved React Router to 6.30.6.
- [x] **Fixed the second security review's findings** (2026-10-08, migration `20261008160000`; rollout steps above).
  - Owners can't delete, overwrite or re-upload the photo or thumbnail files of a listing that is no longer an active draft, and can only save photos stored in this project's bucket. Before, they could swap the pictures on an approved listing without review.
  - The database sets `created_at` and `view_count` itself, so owners can't push a listing to the top of the latest or most-viewed lists.
  - Size limits against filling the free 500 MB database: listing title 200 and description 10,000 characters, bounded prices and areas, profile fields, 50 drafts per owner, 100 photo rows per listing, 500 files per user. Only admins can add locations.
- [x] **Photo files are removed when a photo or listing is deleted** (2026-10-08, commit `1c2916c`). The 26 orphaned files were deleted, and both paths were tested live. Photos uploaded on a form that is never saved are not cleaned up.
- [x] **Regenerated `supabase/schema_snapshot.sql` from the live database** (2026-10-03).
  - The old hand-written file was 298 items out of date. A database built from it could not delete properties, because the foreign keys lacked `ON DELETE CASCADE`.
  - The new file is generated by `npm run db:snapshot` (`supabase/schema-snapshot.sh`).
  - It was checked by restoring it into an empty Postgres and comparing every table, column, constraint, index, function, trigger, policy, grant and the Storage bucket with live. It matches exactly.
- [x] **Restored the `ensure_rls` event trigger on the live database** (2026-10-03).
  - It turns on row level security for every new table in `public`. The Sydney → Mumbai move had dropped it.
  - It was brought back by migration `20261003120000_restore_ensure_rls_event_trigger.sql`.
  - Mumbai now matches the original Sydney database with zero differences, and the 22 migrations alone rebuild it exactly.
- [x] **Deployed the updated `lead-notification` function** (2026-10-03).
  - It now returns only `{ ok: true }` instead of the enquirer's details.
  - Checked on 2026-10-07: the live source matches the repo, and calls without a login token are still rejected.
- [x] **Removed the broken Messenger share button** (2026-10-07). Facebook's send dialog needs an app ID, which the site doesn't have. The share bar keeps Facebook, WhatsApp, Viber and copy link.
- [x] **Deleted the stale `bun.lockb`** (2026-10-07).
  - It had not changed since the first commit, and its presence could make Netlify install with Bun.
  - Installs now come only from `package-lock.json`, which matches `package.json`.
- [x] **Pointed `.env` at the Mumbai project** (`gksaovhgxlxvogxsejkj`).
  - It is still tracked in git despite `.gitignore`. It holds only public `VITE_` values.
  - Untrack it (`git rm --cached .env`) only after the same values are set as Netlify environment variables, because the build reads them.
