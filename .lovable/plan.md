

# Morgan Developers — Real Estate App for Nepal

## Overview
A Supabase-powered real estate platform with a premium, calm aesthetic targeting property buyers in Nepal. Features property listings with search/sort/filter, admin management, and lead capture.

---

## 1. Design System & Branding
- **Typography**: DM Sans for headings, Inter for body text
- **Colors**: Light cream/white backgrounds, charcoal (#2D2D2D) text, subtle gold (#C9A96E) accents for buttons, borders, and highlights
- **Spacing**: Generous padding and whitespace for a luxury feel
- **Components**: Built on shadcn/ui with Tailwind utility classes

## 2. Database Schema (Supabase)

### Tables
- **profiles** — id (FK to auth.users), full_name, phone, avatar_url, created_at
- **user_roles** — id, user_id (FK to auth.users), role (enum: admin, buyer)
- **locations** — id, name, parent_id (self-referencing FK for hierarchy: District > City > Area)
- **properties** — id, title, price, location_id (FK), type (enum: apartment/house/land), status (enum: draft/published/sold), description, area_sqft, created_by (FK to auth.users), created_at, updated_at
- **property_images** — id, property_id (FK), image_url, display_order, is_primary
- **amenities** — id, name, icon
- **property_amenities** — property_id (FK), amenity_id (FK) — junction table
- **leads** — id, name, email, phone, message, property_id (FK), budget_range, preferred_contact_time, source (enum: website/referral), created_at

### Security
- Row-Level Security on all tables
- Public read access for published properties only
- Full CRUD for admin role via `has_role()` security definer function
- Leads: anyone can insert, only admins can read/update/delete
- Storage bucket `property-images` with public read access

## 3. Authentication
- Supabase Auth with email/password login
- Admin login page at `/admin/login`
- Auto-create profile on signup via database trigger
- Role-based access using `user_roles` table (never on profiles)

## 4. Pages

### Public Pages
- **Home** (`/`) — Blank placeholder with hero section skeleton and navigation
- **Property Listings** (`/properties`) — Grid of property cards with:
  - Search bar (by title/location)
  - Sort by price (low/high) and date (newest)
  - Filter by location, property type, and price range
- **Property Detail** (`/properties/:id`) — Blank placeholder page with basic layout

### Admin Pages
- **Admin Login** (`/admin/login`) — Email/password login form
- **Admin Dashboard** (`/admin`) — Protected route, placeholder for future CRUD

## 5. Key Components
- `Navbar` — Logo, navigation links, mobile menu
- `PropertyCard` — Image, title, price, location, type badge
- `SearchBar` — Text input with search icon
- `FilterSidebar` — Location, type, and price range filters
- `LeadForm` — Inquiry form (to be placed on property detail later)
- `Footer` — Company info, links, contact details

## 6. Technical Setup
- TypeScript throughout
- Supabase client configured via environment variables
- React Query for data fetching
- React Router for navigation
- Storage bucket for property images (created via SQL migration)
- Optimized for Supabase free tier — no triggers beyond profile auto-creation

