# TODO

Open items from the code audit on 2026-10-03.

## Deploy

- [ ] Deploy the updated lead notification function so it stops returning the enquirer's details to the caller:
  `supabase functions deploy lead-notification`

## Needs a decision

- [ ] **Lead emails are not sent.** `supabase/functions/lead-notification` only logs each enquiry; the Resend email code is commented out. New leads only appear in the admin dashboard.
- [ ] **Messenger share button is broken.** Facebook's send dialog needs an `app_id` (`src/components/ShareButtons.tsx`). Add a Facebook app ID or remove the button.
- [ ] **Keep one lockfile.** Both `bun.lockb` and `package-lock.json` exist, so Netlify may install with Bun. Remove the one that isn't used.

## Housekeeping

- [ ] **Update the local `.env`.** It still points at the old Sydney Supabase project, which is due to be deleted around 2026-10-17. Switch it to the Mumbai project (`gksaovhgxlxvogxsejkj`). The file is tracked in git despite `.gitignore`; it holds only public `VITE_` values, but consider untracking it with `git rm --cached .env`.

## Database hardening (optional, needs migrations)

- [ ] `log_property_view` trusts the `_user_id` the browser sends and accepts any property ID, so anyone can inflate view counts or credit views to another user. Take the user from `auth.uid()` and only count published, non-deleted listings.
- [ ] Any signed-in user can insert rows into `audit_logs`, so the audit trail can be padded with fake entries. Restrict inserts to moderators and admins, or write audit rows from triggers.
- [ ] Photos are not removed from Storage when a listing or a photo is deleted. Clean up orphaned files to stay within the free 1 GB Storage limit.
