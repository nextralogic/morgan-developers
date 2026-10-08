-- =============================================================
-- FULL SCHEMA SNAPSHOT — Morgan Developers Real Estate Platform
-- =============================================================
-- Generated from the live Supabase project by supabase/schema-snapshot.sh.
-- Do not edit by hand: change the database through a migration in
-- supabase/migrations, then run `npm run db:snapshot` and commit the result.
--
-- It recreates everything the app needs on a new, empty Supabase project:
--   * the public schema: types, tables, constraints, indexes, functions,
--     triggers, row level security, policies and grants
--   * the trigger on auth.users that creates a profile for each new user
--   * the property-images Storage bucket and its access policies
--   * event triggers that call public functions
-- It holds no data. Run it once on the empty project, in the SQL Editor or with
--   psql "<connection string>" -f supabase/schema_snapshot.sql
-- =============================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE SCHEMA IF NOT EXISTS "public";

ALTER SCHEMA "public" OWNER TO "pg_database_owner";

COMMENT ON SCHEMA "public" IS 'standard public schema';

CREATE TYPE "public"."app_role" AS ENUM (
    'super_admin',
    'admin',
    'moderator',
    'buyer'
);

ALTER TYPE "public"."app_role" OWNER TO "postgres";

CREATE TYPE "public"."lead_source" AS ENUM (
    'website',
    'referral'
);

ALTER TYPE "public"."lead_source" OWNER TO "postgres";

CREATE TYPE "public"."lead_status" AS ENUM (
    'new',
    'in_progress',
    'contacted',
    'closed',
    'archived'
);

ALTER TYPE "public"."lead_status" OWNER TO "postgres";

CREATE TYPE "public"."property_status" AS ENUM (
    'draft',
    'published',
    'sold'
);

ALTER TYPE "public"."property_status" OWNER TO "postgres";

CREATE TYPE "public"."property_type" AS ENUM (
    'apartment',
    'house',
    'land'
);

ALTER TYPE "public"."property_type" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."guard_property_public_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.property_public_id IS DISTINCT FROM OLD.property_public_id THEN
      RAISE EXCEPTION 'property_public_id cannot be changed';
    END IF;
  -- The column default has already taken its number from the sequence, so only a
  -- number set by hand can be above the last one the sequence handed out.
  ELSIF NEW.property_public_id > (SELECT last_value FROM public.property_public_id_seq) THEN
    RAISE EXCEPTION 'property_public_id is assigned automatically';
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."guard_property_public_id"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."guard_property_server_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- API requests run as anon or authenticated. log_property_view runs as the
  -- table owner, so it can still count views.
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.view_count := 0;
      NEW.created_at := now();
      NEW.updated_at := now();
    ELSE
      NEW.view_count := OLD.view_count;
      NEW.created_at := OLD.created_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."guard_property_server_fields"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, left(NEW.raw_user_meta_data ->> 'full_name', 200));
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT coalesce(_user_id = auth.uid(), false) AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR (_role = 'admin' AND role = 'super_admin')
        OR (_role = 'moderator' AND role IN ('admin', 'super_admin'))
        OR (_role = 'buyer' AND role IN ('moderator', 'admin', 'super_admin'))
      )
  )
$$;

ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."limit_listing_photos"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated')
     AND NOT public.has_role(auth.uid(), 'moderator')
     AND EXISTS (
       SELECT 1 FROM public.property_images pi
       WHERE pi.property_id IN (SELECT property_id FROM new_rows)
       GROUP BY pi.property_id
       HAVING count(*) > 100
     ) THEN
    RAISE EXCEPTION 'A listing can have at most 100 photo rows';
  END IF;
  RETURN NULL;
END;
$$;

ALTER FUNCTION "public"."limit_listing_photos"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."limit_owner_drafts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated')
     AND NOT public.has_role(auth.uid(), 'moderator')
     AND EXISTS (
       SELECT 1 FROM public.properties p
       WHERE p.created_by IN (SELECT created_by FROM new_rows) AND p.status = 'draft'
       GROUP BY p.created_by
       HAVING count(*) > 50
     ) THEN
    RAISE EXCEPTION 'An owner can have at most 50 draft listings';
  END IF;
  RETURN NULL;
END;
$$;

ALTER FUNCTION "public"."limit_owner_drafts"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."listing_photo_locked"("_name" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
  SELECT EXISTS (
    SELECT 1
    FROM public.property_images pi
    JOIN public.properties p ON p.id = pi.property_id
    CROSS JOIN LATERAL (
      SELECT split_part(pi.image_url, '/storage/v1/object/public/property-images/', 2) AS path
    ) f
    WHERE NOT (p.status = 'draft' AND p.is_deleted = false)
      AND f.path <> ''
      AND _name IN (f.path, regexp_replace(f.path, '\.[a-z0-9]+$', '', 'i') || '-thumb.webp')
  )
$_$;

ALTER FUNCTION "public"."listing_photo_locked"("_name" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."listing_photos_base_url"() RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT 'https://gksaovhgxlxvogxsejkj.supabase.co/storage/v1/object/public/property-images/'::text
$$;

ALTER FUNCTION "public"."listing_photos_base_url"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."log_property_view"("_property_id" "uuid", "_session_id" "text" DEFAULT NULL::"text", "_user_id" "uuid" DEFAULT NULL::"uuid", "_user_agent" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.properties
  SET view_count = view_count + 1
  WHERE id = _property_id AND status = 'published' AND is_deleted = false;

  IF FOUND THEN
    INSERT INTO public.property_views (property_id, session_id, user_id, user_agent)
    VALUES (_property_id, left(_session_id, 64), auth.uid(), left(_user_agent, 256));
  END IF;
END;
$$;

ALTER FUNCTION "public"."log_property_view"("_property_id" "uuid", "_session_id" "text", "_user_id" "uuid", "_user_agent" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;

ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."update_properties_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF (to_jsonb(NEW) - 'view_count' - 'updated_at') = (to_jsonb(OLD) - 'view_count' - 'updated_at') THEN
    NEW.updated_at = OLD.updated_at;
  ELSE
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."update_properties_updated_at"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."validate_area_values"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.area_value IS NOT NULL AND NEW.area_value < 0 THEN
    RAISE EXCEPTION 'area_value must be >= 0';
  END IF;
  IF NEW.area_sqft IS NOT NULL AND NEW.area_sqft < 0 THEN
    RAISE EXCEPTION 'area_sqft must be >= 0';
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."validate_area_values"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."amenities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "icon" "text"
);

ALTER TABLE "public"."amenities" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "performed_by" "uuid" NOT NULL,
    "performed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb"
);

ALTER TABLE "public"."audit_logs" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "message" "text",
    "property_id" "uuid",
    "budget_range" "text",
    "preferred_contact_time" "text",
    "source" "public"."lead_source" DEFAULT 'website'::"public"."lead_source" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "public"."lead_status" DEFAULT 'new'::"public"."lead_status" NOT NULL,
    "notes" "text",
    "handled_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notified_at" timestamp with time zone,
    CONSTRAINT "leads_budget_range_length" CHECK (("char_length"("budget_range") <= 100)),
    CONSTRAINT "leads_email_length" CHECK (("char_length"("email") <= 254)),
    CONSTRAINT "leads_message_length" CHECK (("char_length"("message") <= 5000)),
    CONSTRAINT "leads_name_length" CHECK (("char_length"("name") <= 200)),
    CONSTRAINT "leads_phone_length" CHECK (("char_length"("phone") <= 40)),
    CONSTRAINT "leads_preferred_contact_time_length" CHECK (("char_length"("preferred_contact_time") <= 50))
);

ALTER TABLE "public"."leads" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "parent_id" "uuid",
    "province" "text",
    "district" "text",
    "municipality_or_city" "text",
    "ward" integer,
    "area_name" "text",
    "display_name" "text",
    "search_key" "text"
);

ALTER TABLE "public"."locations" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "phone" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_avatar_url_length" CHECK (("char_length"("avatar_url") <= 2048)),
    CONSTRAINT "profiles_full_name_length" CHECK (("char_length"("full_name") <= 200)),
    CONSTRAINT "profiles_phone_length" CHECK (("char_length"("phone") <= 40))
);

ALTER TABLE "public"."profiles" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."property_public_id_seq"
    START WITH 1001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE "public"."property_public_id_seq" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."properties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "price" numeric DEFAULT 0 NOT NULL,
    "location_id" "uuid",
    "type" "public"."property_type" DEFAULT 'house'::"public"."property_type" NOT NULL,
    "status" "public"."property_status" DEFAULT 'draft'::"public"."property_status" NOT NULL,
    "description" "text",
    "area_sqft" numeric,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "property_public_id" integer DEFAULT "nextval"('"public"."property_public_id_seq"'::"regclass") NOT NULL,
    "area_unit" "text" DEFAULT 'sq_feet'::"text",
    "area_value" numeric,
    "view_count" bigint DEFAULT 0 NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "chk_properties_area_positive" CHECK ((("area_sqft" IS NULL) OR ("area_sqft" > (0)::numeric))),
    CONSTRAINT "chk_properties_price_non_negative" CHECK (("price" >= (0)::numeric)),
    CONSTRAINT "properties_area_sqft_size" CHECK ((("area_sqft" < '1000000000000000'::numeric) AND ("scale"("area_sqft") <= 30))),
    CONSTRAINT "properties_area_unit_length" CHECK (("char_length"("area_unit") <= 20)),
    CONSTRAINT "properties_area_value_size" CHECK ((("area_value" < '1000000000000'::numeric) AND ("scale"("area_value") <= 30))),
    CONSTRAINT "properties_description_length" CHECK (("char_length"("description") <= 10000)),
    CONSTRAINT "properties_price_size" CHECK ((("price" < '10000000000000'::numeric) AND ("scale"("price") <= 30))),
    CONSTRAINT "properties_title_length" CHECK (("char_length"("title") <= 200))
);

ALTER TABLE "public"."properties" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."property_amenities" (
    "property_id" "uuid" NOT NULL,
    "amenity_id" "uuid" NOT NULL
);

ALTER TABLE "public"."property_amenities" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."property_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    CONSTRAINT "chk_images_display_order_non_negative" CHECK (("display_order" >= 0)),
    CONSTRAINT "property_images_image_url_length" CHECK (("char_length"("image_url") <= 2048))
);

ALTER TABLE "public"."property_images" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."property_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "viewed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "session_id" "text",
    "user_id" "uuid",
    "user_agent" "text",
    "ip_hash" "text"
);

ALTER TABLE "public"."property_views" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL
);

ALTER TABLE "public"."user_roles" OWNER TO "postgres";

ALTER TABLE ONLY "public"."amenities"
    ADD CONSTRAINT "amenities_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_property_public_id_key" UNIQUE ("property_public_id");

ALTER TABLE ONLY "public"."property_amenities"
    ADD CONSTRAINT "property_amenities_pkey" PRIMARY KEY ("property_id", "amenity_id");

ALTER TABLE ONLY "public"."property_images"
    ADD CONSTRAINT "property_images_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."property_views"
    ADD CONSTRAINT "property_views_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");

CREATE INDEX "idx_audit_logs_entity" ON "public"."audit_logs" USING "btree" ("entity_type", "entity_id");

CREATE INDEX "idx_audit_logs_performed_at" ON "public"."audit_logs" USING "btree" ("performed_at" DESC);

CREATE INDEX "idx_audit_logs_performed_by" ON "public"."audit_logs" USING "btree" ("performed_by");

CREATE INDEX "idx_leads_created_at" ON "public"."leads" USING "btree" ("created_at" DESC);

CREATE INDEX "idx_leads_property_id" ON "public"."leads" USING "btree" ("property_id");

CREATE INDEX "idx_leads_status_created" ON "public"."leads" USING "btree" ("status", "created_at" DESC);

CREATE INDEX "idx_locations_address" ON "public"."locations" USING "btree" ("province", "district", "municipality_or_city");

CREATE INDEX "idx_locations_display_name" ON "public"."locations" USING "btree" ("display_name");

CREATE INDEX "idx_locations_district" ON "public"."locations" USING "btree" ("district");

CREATE INDEX "idx_locations_municipality" ON "public"."locations" USING "btree" ("municipality_or_city");

CREATE INDEX "idx_locations_parent_id" ON "public"."locations" USING "btree" ("parent_id");

CREATE INDEX "idx_locations_province" ON "public"."locations" USING "btree" ("province");

CREATE INDEX "idx_locations_search_key" ON "public"."locations" USING "btree" ("search_key");

CREATE INDEX "idx_properties_created_at" ON "public"."properties" USING "btree" ("created_at" DESC);

CREATE INDEX "idx_properties_created_by" ON "public"."properties" USING "btree" ("created_by");

CREATE INDEX "idx_properties_location_id" ON "public"."properties" USING "btree" ("location_id");

CREATE INDEX "idx_properties_price" ON "public"."properties" USING "btree" ("price");

CREATE INDEX "idx_properties_property_public_id" ON "public"."properties" USING "btree" ("property_public_id");

CREATE UNIQUE INDEX "idx_properties_public_id" ON "public"."properties" USING "btree" ("property_public_id");

CREATE INDEX "idx_properties_status" ON "public"."properties" USING "btree" ("status");

CREATE INDEX "idx_properties_status_area" ON "public"."properties" USING "btree" ("status", "area_sqft");

CREATE INDEX "idx_properties_status_created" ON "public"."properties" USING "btree" ("status", "created_at" DESC);

CREATE INDEX "idx_properties_status_location" ON "public"."properties" USING "btree" ("status", "location_id", "created_at" DESC);

CREATE INDEX "idx_properties_status_not_deleted" ON "public"."properties" USING "btree" ("status", "is_deleted") WHERE ("is_deleted" = false);

CREATE INDEX "idx_properties_status_price" ON "public"."properties" USING "btree" ("status", "price");

CREATE INDEX "idx_properties_status_type" ON "public"."properties" USING "btree" ("status", "type");

CREATE INDEX "idx_properties_type" ON "public"."properties" USING "btree" ("type");

CREATE INDEX "idx_properties_view_count" ON "public"."properties" USING "btree" ("view_count" DESC);

CREATE INDEX "idx_property_amenities_property_id" ON "public"."property_amenities" USING "btree" ("property_id");

CREATE INDEX "idx_property_images_property_id" ON "public"."property_images" USING "btree" ("property_id");

CREATE INDEX "idx_property_views_property_id" ON "public"."property_views" USING "btree" ("property_id");

CREATE INDEX "idx_property_views_property_viewed" ON "public"."property_views" USING "btree" ("property_id", "viewed_at" DESC);

CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles" USING "btree" ("user_id");

CREATE UNIQUE INDEX "locations_address_unique" ON "public"."locations" USING "btree" (COALESCE("province", ''::"text"), COALESCE("district", ''::"text"), COALESCE("municipality_or_city", ''::"text"), COALESCE("ward", 0), COALESCE("area_name", ''::"text"));

CREATE OR REPLACE TRIGGER "guard_property_public_id" BEFORE INSERT OR UPDATE OF "property_public_id" ON "public"."properties" FOR EACH ROW EXECUTE FUNCTION "public"."guard_property_public_id"();

CREATE OR REPLACE TRIGGER "guard_property_server_fields" BEFORE INSERT OR UPDATE ON "public"."properties" FOR EACH ROW EXECUTE FUNCTION "public"."guard_property_server_fields"();

CREATE OR REPLACE TRIGGER "limit_listing_photos" AFTER INSERT ON "public"."property_images" REFERENCING NEW TABLE AS "new_rows" FOR EACH STATEMENT EXECUTE FUNCTION "public"."limit_listing_photos"();

CREATE OR REPLACE TRIGGER "limit_owner_drafts" AFTER INSERT ON "public"."properties" REFERENCING NEW TABLE AS "new_rows" FOR EACH STATEMENT EXECUTE FUNCTION "public"."limit_owner_drafts"();

CREATE OR REPLACE TRIGGER "update_leads_updated_at" BEFORE UPDATE ON "public"."leads" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_properties_updated_at" BEFORE UPDATE ON "public"."properties" FOR EACH ROW EXECUTE FUNCTION "public"."update_properties_updated_at"();

CREATE OR REPLACE TRIGGER "validate_property_area" BEFORE INSERT OR UPDATE ON "public"."properties" FOR EACH ROW EXECUTE FUNCTION "public"."validate_area_values"();

ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."profiles"("id");

ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."property_amenities"
    ADD CONSTRAINT "property_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "public"."amenities"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."property_amenities"
    ADD CONSTRAINT "property_amenities_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."property_images"
    ADD CONSTRAINT "property_images_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."property_views"
    ADD CONSTRAINT "property_views_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

CREATE POLICY "Admins can delete leads" ON "public"."leads" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));

CREATE POLICY "Admins can do everything with properties" ON "public"."properties" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));

CREATE POLICY "Admins can manage amenities" ON "public"."amenities" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));

CREATE POLICY "Admins can manage locations" ON "public"."locations" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));

CREATE POLICY "Admins can manage property amenities" ON "public"."property_amenities" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));

CREATE POLICY "Admins can manage property images" ON "public"."property_images" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));

CREATE POLICY "Admins can read views" ON "public"."property_views" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));

CREATE POLICY "Admins can update leads" ON "public"."leads" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));

CREATE POLICY "Admins can view all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'moderator'::"public"."app_role"));

CREATE POLICY "Admins can view audit logs" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));

CREATE POLICY "Admins can view leads" ON "public"."leads" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));

CREATE POLICY "Amenities are publicly readable" ON "public"."amenities" FOR SELECT USING (true);

CREATE POLICY "Locations are publicly readable" ON "public"."locations" FOR SELECT USING (true);

CREATE POLICY "Moderators can update properties" ON "public"."properties" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'moderator'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'moderator'::"public"."app_role"));

CREATE POLICY "Moderators can view all properties" ON "public"."properties" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'moderator'::"public"."app_role"));

CREATE POLICY "Moderators can view audit logs" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'moderator'::"public"."app_role"));

CREATE POLICY "Photos are visible with their listing" ON "public"."property_images" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."properties"
  WHERE ("properties"."id" = "property_images"."property_id"))));

CREATE POLICY "Property amenities are publicly readable" ON "public"."property_amenities" FOR SELECT USING (true);

CREATE POLICY "Public can view published properties" ON "public"."properties" FOR SELECT USING ((("status" = 'published'::"public"."property_status") AND ("is_deleted" = false)));

CREATE POLICY "Staff can insert audit logs" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "performed_by") AND "public"."has_role"("auth"."uid"(), 'moderator'::"public"."app_role")));

CREATE POLICY "Super admins can manage roles" ON "public"."user_roles" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));

CREATE POLICY "Users can create own draft properties" ON "public"."properties" FOR INSERT WITH CHECK ((("auth"."uid"() = "created_by") AND ("status" = 'draft'::"public"."property_status")));

CREATE POLICY "Users can delete own properties" ON "public"."properties" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "created_by") AND ("is_deleted" = false)));

CREATE POLICY "Users can delete own property amenities" ON "public"."property_amenities" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."properties"
  WHERE (("properties"."id" = "property_amenities"."property_id") AND ("properties"."created_by" = "auth"."uid"()) AND ("properties"."status" = 'draft'::"public"."property_status") AND ("properties"."is_deleted" = false)))));

CREATE POLICY "Users can delete own property images" ON "public"."property_images" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."properties"
  WHERE (("properties"."id" = "property_images"."property_id") AND ("properties"."created_by" = "auth"."uid"()) AND ("properties"."status" = 'draft'::"public"."property_status") AND ("properties"."is_deleted" = false)))));

CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));

CREATE POLICY "Users can insert own property amenities" ON "public"."property_amenities" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."properties"
  WHERE (("properties"."id" = "property_amenities"."property_id") AND ("properties"."created_by" = "auth"."uid"()) AND ("properties"."status" = 'draft'::"public"."property_status") AND ("properties"."is_deleted" = false)))));

CREATE POLICY "Users can insert own property images" ON "public"."property_images" FOR INSERT TO "authenticated" WITH CHECK (("starts_with"("image_url", "public"."listing_photos_base_url"()) AND ("substr"("image_url", ("char_length"("public"."listing_photos_base_url"()) + 1)) ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-][A-Za-z0-9._-]*$'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."properties"
  WHERE (("properties"."id" = "property_images"."property_id") AND ("properties"."created_by" = "auth"."uid"()) AND ("properties"."status" = 'draft'::"public"."property_status") AND ("properties"."is_deleted" = false))))));

CREATE POLICY "Users can update own draft properties" ON "public"."properties" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "created_by") AND ("status" = 'draft'::"public"."property_status") AND ("is_deleted" = false))) WITH CHECK ((("auth"."uid"() = "created_by") AND ("status" = 'draft'::"public"."property_status") AND ("is_deleted" = false)));

CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));

CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));

CREATE POLICY "Users can view own properties" ON "public"."properties" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "created_by") AND ("is_deleted" = false)));

CREATE POLICY "Users can view own roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));

ALTER TABLE "public"."amenities" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."leads" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."properties" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."property_amenities" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."property_images" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."property_views" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON FUNCTION "public"."guard_property_public_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_property_public_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_property_public_id"() TO "service_role";

GRANT ALL ON FUNCTION "public"."guard_property_server_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_property_server_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_property_server_fields"() TO "service_role";

GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";

GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";

GRANT ALL ON FUNCTION "public"."limit_listing_photos"() TO "anon";
GRANT ALL ON FUNCTION "public"."limit_listing_photos"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."limit_listing_photos"() TO "service_role";

GRANT ALL ON FUNCTION "public"."limit_owner_drafts"() TO "anon";
GRANT ALL ON FUNCTION "public"."limit_owner_drafts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."limit_owner_drafts"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."listing_photo_locked"("_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."listing_photo_locked"("_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."listing_photo_locked"("_name" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."listing_photos_base_url"() TO "anon";
GRANT ALL ON FUNCTION "public"."listing_photos_base_url"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."listing_photos_base_url"() TO "service_role";

GRANT ALL ON FUNCTION "public"."log_property_view"("_property_id" "uuid", "_session_id" "text", "_user_id" "uuid", "_user_agent" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_property_view"("_property_id" "uuid", "_session_id" "text", "_user_id" "uuid", "_user_agent" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_property_view"("_property_id" "uuid", "_session_id" "text", "_user_id" "uuid", "_user_agent" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";

GRANT ALL ON FUNCTION "public"."update_properties_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_properties_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_properties_updated_at"() TO "service_role";

GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";

GRANT ALL ON FUNCTION "public"."validate_area_values"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_area_values"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_area_values"() TO "service_role";

GRANT ALL ON TABLE "public"."amenities" TO "anon";
GRANT ALL ON TABLE "public"."amenities" TO "authenticated";
GRANT ALL ON TABLE "public"."amenities" TO "service_role";

GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";

GRANT ALL ON TABLE "public"."leads" TO "anon";
GRANT ALL ON TABLE "public"."leads" TO "authenticated";
GRANT ALL ON TABLE "public"."leads" TO "service_role";

GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";

GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";

GRANT ALL ON SEQUENCE "public"."property_public_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."property_public_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."property_public_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."properties" TO "anon";
GRANT ALL ON TABLE "public"."properties" TO "authenticated";
GRANT ALL ON TABLE "public"."properties" TO "service_role";

GRANT ALL ON TABLE "public"."property_amenities" TO "anon";
GRANT ALL ON TABLE "public"."property_amenities" TO "authenticated";
GRANT ALL ON TABLE "public"."property_amenities" TO "service_role";

GRANT ALL ON TABLE "public"."property_images" TO "anon";
GRANT ALL ON TABLE "public"."property_images" TO "authenticated";
GRANT ALL ON TABLE "public"."property_images" TO "service_role";

GRANT ALL ON TABLE "public"."property_views" TO "anon";
GRANT ALL ON TABLE "public"."property_views" TO "authenticated";
GRANT ALL ON TABLE "public"."property_views" TO "service_role";

GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";

-- =============================================================
-- Outside the public schema: auth trigger, Storage, event triggers
-- =============================================================

CREATE OR REPLACE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('property-images', 'property-images', true, 1048576, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can delete property images" ON storage.objects AS PERMISSIVE FOR DELETE TO public
  USING (((bucket_id = 'property-images'::text) AND public.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY "Admins can update property images" ON storage.objects AS PERMISSIVE FOR UPDATE TO public
  USING (((bucket_id = 'property-images'::text) AND public.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY "Admins can upload property images" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((bucket_id = 'property-images'::text) AND public.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY "Admins can view property images" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING (((bucket_id = 'property-images'::text) AND public.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY "Authenticated users can upload to own folder" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'property-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text) AND (NOT public.listing_photo_locked(name)) AND ( SELECT ((COALESCE(sum(((o.metadata ->> 'size'::text))::bigint), (0)::numeric) < (((50 * 1024) * 1024))::numeric) AND (count(*) < 500))
   FROM storage.objects o
  WHERE ((o.bucket_id = 'property-images'::text) AND (o.name ~~ ((auth.uid())::text || '/%'::text))))));

CREATE POLICY "Users can delete own storage images" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'property-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text) AND (NOT public.listing_photo_locked(name))));

CREATE POLICY "Users can view own storage images" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING (((bucket_id = 'property-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

DROP EVENT TRIGGER IF EXISTS ensure_rls;
CREATE EVENT TRIGGER ensure_rls ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();
