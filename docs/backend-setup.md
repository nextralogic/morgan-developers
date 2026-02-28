# Backend Setup Guide — Morgan Developers

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) installed
- A Supabase project (create at https://supabase.com/dashboard)
- Node.js 18+ and npm/bun

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

This applies the migration in `supabase/migrations/00000000000000_full_schema_snapshot.sql` which creates:

- All enum types (`app_role`, `property_status`, `property_type`, `lead_source`, `lead_status`)
- All tables with constraints, defaults, and foreign keys
- All indexes (search, compound, partial)
- All functions (`has_role`, `handle_new_user`, `update_updated_at_column`, `validate_area_values`, `log_property_view`)
- All triggers (auto-profile creation, updated_at, area validation)
- All RLS policies for every table
- Storage bucket `property-images` with RLS policies

**Note:** If you already have incremental migrations from Lovable, you may want to use only this snapshot on a fresh project. For an existing project, use `supabase db push` carefully or reset with `supabase db reset`.

---

## 3. Deploy Edge Functions

```bash
supabase functions deploy lead-notification
supabase functions deploy sitemap
```

### Edge Function Secrets

Set required secrets for edge functions:

```bash
supabase secrets set SUPABASE_URL=https://<ref>.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
# Optional (for email notifications):
# supabase secrets set RESEND_API_KEY=re_xxx
# supabase secrets set EMAIL_FROM=noreply@yourdomain.com
# supabase secrets set EMAIL_ADMIN_TO=admin@yourdomain.com
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
| leads | INSERT only | INSERT only | SELECT, UPDATE | Full CRUD | Full CRUD |
| profiles | — | Own profile | SELECT all | SELECT all | SELECT all |
| user_roles | — | Own roles (read) | Own roles (read) | Own roles (read) | Full CRUD |
| audit_logs | — | — | SELECT | SELECT | SELECT |
| property_views | INSERT | INSERT | INSERT | SELECT + INSERT | SELECT + INSERT |
| amenities | SELECT | SELECT | SELECT | Full CRUD | Full CRUD |

---

## 8. Storage

### Bucket: `property-images`

- **Public:** Yes (anyone can read/view images)
- **Max file size:** 5 MB
- **Allowed MIME types:** `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- **Folder structure:** `<user-uuid>/<filename>` — users upload to their own folder
- **Admin access:** Admins can upload/update/delete any file in the bucket

---

## 9. Edge Functions

| Function | Purpose | Secrets Used |
|---|---|---|
| `lead-notification` | Builds notification summary when a lead is created | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `sitemap` | Generates XML sitemap of published properties | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |

Both functions are in `supabase/functions/` and deployable via `supabase functions deploy <name>`.
