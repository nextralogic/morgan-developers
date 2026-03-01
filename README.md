# Morgan Developers Real Estate App

React + Vite frontend backed by Supabase (Auth, Postgres, Storage, Edge Functions).

## Tech Stack

- React + TypeScript + Vite
- Tailwind + shadcn/ui
- Supabase (`@supabase/supabase-js`)

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Fill `.env`:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_SITE_URL=http://localhost:8080
```

4. Start dev server:

```bash
npm run dev
```

## Backend Setup (Your Supabase Project)

1. Link project:

```bash
supabase login
supabase link --project-ref <project-ref>
```

2. Push migrations:

```bash
supabase db push
```

3. Deploy functions:

```bash
supabase functions deploy lead-notification
supabase functions deploy sitemap
```

4. Set function secrets:

```bash
supabase secrets set SITE_URL=https://<your-domain-or-host>
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are reserved and provided automatically by Supabase in hosted Edge Functions.

## Notes

- Storage bucket used by app: `property-images`
- Sitemap endpoint: `https://<project-ref>.supabase.co/functions/v1/sitemap`
- For full backend details, see `docs/backend-setup.md`.
