# Backend Setup Guide — Morgan Developers

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) installed
- A Supabase project (create at https://supabase.com/dashboard)
- Node.js 18+ and npm

---

## 1. Link to Supabase Project

```bash
supabase link --project-ref <your-project-ref>
```

You'll be prompted for the database password.

---

## 2. Push Database Schema

```bash
supabase db push
```

This applies all SQL migrations in `supabase/migrations/` and creates:

- All enum types (`app_role`, `property_status`, `property_type`, `lead_source`, `lead_status`)
- All tables with constraints, defaults, and foreign keys
- All indexes (search, compound, partial)
- All functions (`has_role`, `handle_new_user`, `update_updated_at_column`, `update_properties_updated_at`, `validate_area_values`, `log_property_view`, `rls_auto_enable`)
- All triggers (auto-profile creation, updated_at, area validation) and the `ensure_rls` event trigger that turns on RLS for new public tables
- All RLS policies for every table
- Storage bucket `property-images` with RLS policies

**Alternative (fresh project only):** You can use `supabase/schema_snapshot.sql` as a single full-schema import in SQL Editor, but the default path for this repo is `supabase db push`.

The snapshot is generated from the live database, so do not edit it by hand. After a schema change, apply the migration and then refresh the snapshot:

```bash
supabase db push
npm run db:snapshot   # needs pg_dump 17+ on PATH (brew install libpq)
```

---

## 3. Deploy Edge Functions

```bash
supabase functions deploy submit-lead
```

### Edge Function Secrets

Set required secrets for edge functions:

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are reserved platform secrets in hosted Supabase Edge Functions, so you don't set them manually.

Set only your custom secrets:

```bash
supabase secrets set SITE_URL=https://<your-domain-or-host>
# Enquiry form CAPTCHA (Cloudflare Turnstile). Set VITE_TURNSTILE_SITE_KEY on the site first,
# because once this secret is set, enquiries without a valid token are refused:
# supabase secrets set TURNSTILE_SECRET_KEY=<turnstile-secret-key>
# Lead alert emails through Resend:
# supabase secrets set RESEND_API_KEY=re_xxx
# supabase secrets set FROM_EMAIL=noreply@yourdomain.com
# supabase secrets set ADMIN_EMAIL=admin@yourdomain.com
```

---

## 4. Environment Variables

Copy `.env.example` to `.env` and fill in your project values:

```bash
cp .env.example .env
```

See `.env.example` for which variables are frontend-safe vs backend-only.

---

## 5. Promote Initial Super Admin

After signing up your first admin user, promote them via SQL:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<user-uuid>', 'super_admin');
```

Run this in the Supabase SQL Editor or via `psql`.

---

## 6. Role Hierarchy

| Role | Capabilities |
|---|---|
| **super_admin** | Everything + manage user roles |
| **admin** | Moderate properties (publish/archive/restore), manage leads, view analytics & audit logs |
| **moderator** | View all properties & leads, change property status, add lead notes |
| **buyer** | Create/edit own draft properties, submit leads |
| **public** | View published properties, submit leads |

The `has_role()` function implements hierarchical checks:
- `has_role(uid, 'admin')` returns `true` for both `admin` and `super_admin`
- `has_role(uid, 'moderator')` returns `true` for `moderator`, `admin`, and `super_admin`

---

## 7. Table Access Summary

| Table | Public | Buyer | Moderator | Admin | Super Admin |
|---|---|---|---|---|---|
| properties | SELECT published | CRUD own drafts | SELECT all, UPDATE status | Full CRUD | Full CRUD |
| leads | — (via `submit-lead`) | — (via `submit-lead`) | — | Full CRUD | Full CRUD |
| profiles | — | Own profile | SELECT all | SELECT all | SELECT all |
| user_roles | — | Own roles (read) | Own roles (read) | Own roles (read) | Full CRUD |
| audit_logs | — | — | SELECT + INSERT | SELECT + INSERT | SELECT + INSERT |
| property_views | — (via `log_property_view`) | — (via `log_property_view`) | — (via `log_property_view`) | SELECT | SELECT |
| amenities | SELECT | SELECT | SELECT | Full CRUD | Full CRUD |
| locations | SELECT | SELECT | SELECT | Full CRUD | Full CRUD |

Non-staff users can have at most 50 drafts and 100 photo rows per listing, and text columns have length limits. The database sets `created_at` and `view_count` itself, so API requests can't choose them.

---

## 8. Storage

### Bucket: `property-images`

- **Public:** Yes: anyone with a photo's link can view it, but only the owner (their own folder) and admins can list files
- **Max file size:** 1 MB (the app compresses photos to 200 KB before upload)
- **Per-user allowance:** 50 MB and 500 files for non-admins
- **Allowed MIME types:** `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- **Folder structure:** `<user-uuid>/<filename>` — users upload to their own folder
- **Owner access:** Owners can upload to and delete from their own folder, but can't overwrite a file, and can't delete or re-upload the photo or thumbnail of a listing that is no longer an active draft (`listing_photo_locked`), so approved listings keep the photos that were reviewed
- **Photo addresses:** Owners can only save photos whose address starts with `listing_photos_base_url()`. That function holds this project's URL, so change it in a new migration if the project moves
- **Admin access:** Admins can upload/update/delete any file in the bucket

---

## 9. Edge Functions

| Function | Purpose | Secrets Used |
|---|---|---|
| `submit-lead` | Checks the enquiry form's Turnstile token, saves the lead and emails the admin. The only way a lead reaches the table. | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `FROM_EMAIL`, `ADMIN_EMAIL` |

It is in `supabase/functions/` and deployable via `supabase functions deploy submit-lead`. The sitemap is served by Netlify (`netlify/edge-functions/sitemap.ts`), not by Supabase.
