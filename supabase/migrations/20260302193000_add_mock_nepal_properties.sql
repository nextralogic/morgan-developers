-- Seed: 20 mock realistic Nepal properties (land / house / apartment)
-- Safe to run multiple times (idempotent).

BEGIN;

CREATE TEMP TABLE md_seed_locations (
  loc_key text PRIMARY KEY,
  name text NOT NULL,
  province text,
  district text,
  municipality_or_city text,
  ward integer,
  area_name text,
  display_name text,
  search_key text
) ON COMMIT DROP;

INSERT INTO md_seed_locations (
  loc_key,
  name,
  province,
  district,
  municipality_or_city,
  ward,
  area_name,
  display_name,
  search_key
)
VALUES
  (
    'ktm_lazimpat',
    'Lazimpat, Ward 5, Kathmandu Metropolitan City, Kathmandu, Bagmati Province',
    'Bagmati Province',
    'Kathmandu',
    'Kathmandu Metropolitan City',
    5,
    'Lazimpat',
    'Lazimpat, Ward 5, Kathmandu Metropolitan City, Kathmandu, Bagmati Province',
    'bagmati province kathmandu kathmandu metropolitan city ward 5 lazimpat'
  ),
  (
    'lalitpur_sanepa',
    'Sanepa, Ward 2, Lalitpur Metropolitan City, Lalitpur, Bagmati Province',
    'Bagmati Province',
    'Lalitpur',
    'Lalitpur Metropolitan City',
    2,
    'Sanepa',
    'Sanepa, Ward 2, Lalitpur Metropolitan City, Lalitpur, Bagmati Province',
    'bagmati province lalitpur lalitpur metropolitan city ward 2 sanepa'
  ),
  (
    'bhaktapur_balkumari',
    'Balkumari, Ward 3, Madhyapur Thimi Municipality, Bhaktapur, Bagmati Province',
    'Bagmati Province',
    'Bhaktapur',
    'Madhyapur Thimi Municipality',
    3,
    'Balkumari',
    'Balkumari, Ward 3, Madhyapur Thimi Municipality, Bhaktapur, Bagmati Province',
    'bagmati province bhaktapur madhyapur thimi municipality ward 3 balkumari'
  ),
  (
    'pokhara_lakeside',
    'Lakeside, Ward 6, Pokhara Metropolitan City, Kaski, Gandaki Province',
    'Gandaki Province',
    'Kaski',
    'Pokhara Metropolitan City',
    6,
    'Lakeside',
    'Lakeside, Ward 6, Pokhara Metropolitan City, Kaski, Gandaki Province',
    'gandaki province kaski pokhara metropolitan city ward 6 lakeside'
  ),
  (
    'bharatpur_narayanghat',
    'Narayanghat, Ward 10, Bharatpur Metropolitan City, Chitwan, Bagmati Province',
    'Bagmati Province',
    'Chitwan',
    'Bharatpur Metropolitan City',
    10,
    'Narayanghat',
    'Narayanghat, Ward 10, Bharatpur Metropolitan City, Chitwan, Bagmati Province',
    'bagmati province chitwan bharatpur metropolitan city ward 10 narayanghat'
  ),
  (
    'butwal_devinagar',
    'Devinagar, Ward 11, Butwal Sub-Metropolitan City, Rupandehi, Lumbini Province',
    'Lumbini Province',
    'Rupandehi',
    'Butwal Sub-Metropolitan City',
    11,
    'Devinagar',
    'Devinagar, Ward 11, Butwal Sub-Metropolitan City, Rupandehi, Lumbini Province',
    'lumbini province rupandehi butwal sub-metropolitan city ward 11 devinagar'
  ),
  (
    'biratnagar_bargachhi',
    'Bargachhi, Ward 4, Biratnagar Metropolitan City, Morang, Koshi Province',
    'Koshi Province',
    'Morang',
    'Biratnagar Metropolitan City',
    4,
    'Bargachhi',
    'Bargachhi, Ward 4, Biratnagar Metropolitan City, Morang, Koshi Province',
    'koshi province morang biratnagar metropolitan city ward 4 bargachhi'
  ),
  (
    'dharan_bhanuchowk',
    'Bhanuchowk, Ward 8, Dharan Sub-Metropolitan City, Sunsari, Koshi Province',
    'Koshi Province',
    'Sunsari',
    'Dharan Sub-Metropolitan City',
    8,
    'Bhanuchowk',
    'Bhanuchowk, Ward 8, Dharan Sub-Metropolitan City, Sunsari, Koshi Province',
    'koshi province sunsari dharan sub-metropolitan city ward 8 bhanuchowk'
  ),
  (
    'janakpur_ramchowk',
    'Ramchowk, Ward 7, Janakpurdham Sub-Metropolitan City, Dhanusha, Madhesh Province',
    'Madhesh Province',
    'Dhanusha',
    'Janakpurdham Sub-Metropolitan City',
    7,
    'Ramchowk',
    'Ramchowk, Ward 7, Janakpurdham Sub-Metropolitan City, Dhanusha, Madhesh Province',
    'madhesh province dhanusha janakpurdham sub-metropolitan city ward 7 ramchowk'
  ),
  (
    'dhangadhi_campusroad',
    'Campus Road, Ward 5, Dhangadhi Sub-Metropolitan City, Kailali, Sudurpashchim Province',
    'Sudurpashchim Province',
    'Kailali',
    'Dhangadhi Sub-Metropolitan City',
    5,
    'Campus Road',
    'Campus Road, Ward 5, Dhangadhi Sub-Metropolitan City, Kailali, Sudurpashchim Province',
    'sudurpashchim province kailali dhangadhi sub-metropolitan city ward 5 campus road'
  ),
  (
    'nepalgunj_tribhuvanchowk',
    'Tribhuvan Chowk, Ward 12, Nepalgunj Sub-Metropolitan City, Banke, Lumbini Province',
    'Lumbini Province',
    'Banke',
    'Nepalgunj Sub-Metropolitan City',
    12,
    'Tribhuvan Chowk',
    'Tribhuvan Chowk, Ward 12, Nepalgunj Sub-Metropolitan City, Banke, Lumbini Province',
    'lumbini province banke nepalgunj sub-metropolitan city ward 12 tribhuvan chowk'
  ),
  (
    'hetauda_pashupati',
    'Pashupatinagar, Ward 4, Hetauda Sub-Metropolitan City, Makwanpur, Bagmati Province',
    'Bagmati Province',
    'Makwanpur',
    'Hetauda Sub-Metropolitan City',
    4,
    'Pashupatinagar',
    'Pashupatinagar, Ward 4, Hetauda Sub-Metropolitan City, Makwanpur, Bagmati Province',
    'bagmati province makwanpur hetauda sub-metropolitan city ward 4 pashupatinagar'
  ),
  (
    'dhulikhel_hospitalroad',
    'Hospital Road, Ward 7, Dhulikhel Municipality, Kavrepalanchok, Bagmati Province',
    'Bagmati Province',
    'Kavrepalanchok',
    'Dhulikhel Municipality',
    7,
    'Hospital Road',
    'Hospital Road, Ward 7, Dhulikhel Municipality, Kavrepalanchok, Bagmati Province',
    'bagmati province kavrepalanchok dhulikhel municipality ward 7 hospital road'
  ),
  (
    'gaidakot_maulakalika',
    'Maulakalika, Ward 2, Gaidakot Municipality, Nawalparasi (Bardaghat Susta East), Gandaki Province',
    'Gandaki Province',
    'Nawalparasi (Bardaghat Susta East)',
    'Gaidakot Municipality',
    2,
    'Maulakalika',
    'Maulakalika, Ward 2, Gaidakot Municipality, Nawalparasi (Bardaghat Susta East), Gandaki Province',
    'gandaki province nawalparasi (bardaghat susta east) gaidakot municipality ward 2 maulakalika'
  );

INSERT INTO public.locations (
  name,
  province,
  district,
  municipality_or_city,
  ward,
  area_name,
  display_name,
  search_key
)
SELECT
  sl.name,
  sl.province,
  sl.district,
  sl.municipality_or_city,
  sl.ward,
  sl.area_name,
  sl.display_name,
  sl.search_key
FROM md_seed_locations sl
WHERE NOT EXISTS (
  SELECT 1
  FROM public.locations l
  WHERE COALESCE(l.province, '') = COALESCE(sl.province, '')
    AND COALESCE(l.district, '') = COALESCE(sl.district, '')
    AND COALESCE(l.municipality_or_city, '') = COALESCE(sl.municipality_or_city, '')
    AND COALESCE(l.ward, 0) = COALESCE(sl.ward, 0)
    AND COALESCE(l.area_name, '') = COALESCE(sl.area_name, '')
);

CREATE TEMP TABLE md_seed_properties (
  property_id uuid PRIMARY KEY,
  loc_key text NOT NULL,
  title text NOT NULL,
  description text,
  price numeric NOT NULL,
  type text NOT NULL,
  status text NOT NULL,
  area_value numeric,
  area_unit text,
  area_sqft numeric,
  view_count bigint
) ON COMMIT DROP;

INSERT INTO md_seed_properties (
  property_id,
  loc_key,
  title,
  description,
  price,
  type,
  status,
  area_value,
  area_unit,
  area_sqft,
  view_count
)
VALUES
  ('90000000-0000-4000-8000-000000000001'::uuid, 'ktm_lazimpat', 'Modern 3BHK Apartment in Lazimpat', 'Well-lit apartment with lift access, backup power, and dedicated parking near embassies and schools.', 22500000, 'apartment', 'published', 1650, 'sq_feet', 1650, 93),
  ('90000000-0000-4000-8000-000000000002'::uuid, 'ktm_lazimpat', 'Premium Family House near Lazimpat Main Road', 'Four-bedroom independent house with private garden, modern kitchen, and easy access to Ring Road.', 48000000, 'house', 'published', 3200, 'sq_feet', 3200, 68),
  ('90000000-0000-4000-8000-000000000003'::uuid, 'lalitpur_sanepa', 'Road-Access Residential Plot in Sanepa', 'Flat east-facing plot in a peaceful residential pocket ideal for premium family home construction.', 37000000, 'land', 'published', 8, 'aana', 2738, 52),
  ('90000000-0000-4000-8000-000000000004'::uuid, 'lalitpur_sanepa', 'Service Apartment Unit in Sanepa', 'Fully furnished apartment with balcony, security, and reliable water supply near Patan area.', 18500000, 'apartment', 'published', 1250, 'sq_feet', 1250, 77),
  ('90000000-0000-4000-8000-000000000005'::uuid, 'bhaktapur_balkumari', 'Newly Built Apartment in Madhyapur Thimi', 'Three-bedroom apartment with open-plan living space and excellent access to Kathmandu-Bhaktapur road.', 15800000, 'apartment', 'published', 1180, 'sq_feet', 1180, 46),
  ('90000000-0000-4000-8000-000000000006'::uuid, 'pokhara_lakeside', 'Lakeside View Duplex House in Pokhara', 'Spacious duplex home with mountain-facing terrace, guest room, and modern interiors near Lakeside.', 36500000, 'house', 'published', 2950, 'sq_feet', 2950, 82),
  ('90000000-0000-4000-8000-000000000007'::uuid, 'pokhara_lakeside', 'Tourism-Friendly Apartment near Lakeside', 'High-demand apartment unit suitable for long-term living or rental income close to tourist hubs.', 17200000, 'apartment', 'published', 1100, 'sq_feet', 1100, 59),
  ('90000000-0000-4000-8000-000000000008'::uuid, 'bharatpur_narayanghat', 'Commercial Land Parcel in Narayanghat Corridor', 'Strategically positioned land suitable for showroom, warehouse, or mixed-use development.', 64000000, 'land', 'published', 12, 'kattha', 43740, 64),
  ('90000000-0000-4000-8000-000000000009'::uuid, 'bharatpur_narayanghat', 'Contemporary House in Bharatpur', 'Move-in ready house with modular kitchen, attached baths, and covered parking in a growing neighborhood.', 25800000, 'house', 'published', 2400, 'sq_feet', 2400, 57),
  ('90000000-0000-4000-8000-000000000010'::uuid, 'butwal_devinagar', 'Corner Commercial Land in Devinagar, Butwal', 'High-visibility corner plot with broad road frontage and strong business potential.', 52000000, 'land', 'published', 6, 'kattha', 21870, 61),
  ('90000000-0000-4000-8000-000000000011'::uuid, 'butwal_devinagar', 'Practical Family House in Butwal', 'Well-maintained two-storey house with ample sunlight and easy daily commute access.', 19800000, 'house', 'published', 2100, 'sq_feet', 2100, 44),
  ('90000000-0000-4000-8000-000000000012'::uuid, 'biratnagar_bargachhi', 'Spacious House in Biratnagar City Core', 'Solidly built home in a mature neighborhood close to hospital, school, and local market.', 23600000, 'house', 'published', 2550, 'sq_feet', 2550, 49),
  ('90000000-0000-4000-8000-000000000013'::uuid, 'dharan_bhanuchowk', 'City Apartment in Dharan Bhanuchowk', 'Compact and efficient apartment with good ventilation and easy public transport access.', 12200000, 'apartment', 'published', 980, 'sq_feet', 980, 39),
  ('90000000-0000-4000-8000-000000000014'::uuid, 'janakpur_ramchowk', 'Investment Land near Janakpurdham Ring Section', 'Regular-shaped plot ideal for residential subdivision in a fast-growing urban belt.', 18800000, 'land', 'published', 18, 'dhur', 3280.5, 42),
  ('90000000-0000-4000-8000-000000000015'::uuid, 'dhangadhi_campusroad', 'Highway-Access Land in Dhangadhi', 'Large flat parcel suitable for logistics, institution, or gated housing project.', 41000000, 'land', 'published', 10, 'kattha', 36450, 55),
  ('90000000-0000-4000-8000-000000000016'::uuid, 'nepalgunj_tribhuvanchowk', 'Renovated House in Nepalgunj', 'Recently upgraded house with modern fittings and strong rental demand in the surrounding area.', 17800000, 'house', 'published', 1900, 'sq_feet', 1900, 36),
  ('90000000-0000-4000-8000-000000000017'::uuid, 'hetauda_pashupati', 'Modern House in Hetauda Sub-Metro', 'Well-designed home with terrace garden and family-oriented layout in a quiet street.', 21400000, 'house', 'published', 2250, 'sq_feet', 2250, 48),
  ('90000000-0000-4000-8000-000000000018'::uuid, 'dhulikhel_hospitalroad', 'Hillside Land in Dhulikhel with Valley Outlook', 'Scenic elevated parcel ideal for boutique resort home or premium weekend residence.', 27500000, 'land', 'published', 1.5, 'ropani', 8214, 58),
  ('90000000-0000-4000-8000-000000000019'::uuid, 'gaidakot_maulakalika', 'Riverside Development Land in Gaidakot', 'Broad plot with future appreciation potential near major transport and market corridors.', 33200000, 'land', 'published', 2, 'ropani', 10952, 53),
  ('90000000-0000-4000-8000-000000000020'::uuid, 'biratnagar_bargachhi', 'High-Rise Apartment Unit in Biratnagar', 'Ready apartment with elevator, security desk, and ample natural light in a central location.', 14600000, 'apartment', 'published', 1050, 'sq_feet', 1050, 41);

INSERT INTO public.properties (
  id,
  title,
  description,
  price,
  type,
  status,
  location_id,
  area_sqft,
  area_unit,
  area_value,
  is_deleted,
  view_count
)
SELECT
  sp.property_id,
  sp.title,
  sp.description,
  sp.price,
  sp.type::public.property_type,
  sp.status::public.property_status,
  l.id,
  sp.area_sqft,
  sp.area_unit,
  sp.area_value,
  false,
  sp.view_count
FROM md_seed_properties sp
JOIN md_seed_locations sl
  ON sl.loc_key = sp.loc_key
JOIN public.locations l
  ON COALESCE(l.province, '') = COALESCE(sl.province, '')
 AND COALESCE(l.district, '') = COALESCE(sl.district, '')
 AND COALESCE(l.municipality_or_city, '') = COALESCE(sl.municipality_or_city, '')
 AND COALESCE(l.ward, 0) = COALESCE(sl.ward, 0)
 AND COALESCE(l.area_name, '') = COALESCE(sl.area_name, '')
WHERE NOT EXISTS (
  SELECT 1 FROM public.properties p WHERE p.id = sp.property_id
);

CREATE TEMP TABLE md_seed_images (
  image_id uuid PRIMARY KEY,
  property_id uuid NOT NULL,
  image_url text NOT NULL,
  is_primary boolean NOT NULL,
  display_order integer NOT NULL
) ON COMMIT DROP;

INSERT INTO md_seed_images (image_id, property_id, image_url, is_primary, display_order)
VALUES
  ('91000000-0000-4000-8000-000000000001'::uuid, '90000000-0000-4000-8000-000000000001'::uuid, 'https://source.unsplash.com/random/1600x900/?kathmandu,apartment,nepal&sig=101', true, 0),
  ('91000000-0000-4000-8000-000000000002'::uuid, '90000000-0000-4000-8000-000000000002'::uuid, 'https://source.unsplash.com/random/1600x900/?nepal,modern,house&sig=102', true, 0),
  ('91000000-0000-4000-8000-000000000003'::uuid, '90000000-0000-4000-8000-000000000003'::uuid, 'https://source.unsplash.com/random/1600x900/?land,plot,nepal&sig=103', true, 0),
  ('91000000-0000-4000-8000-000000000004'::uuid, '90000000-0000-4000-8000-000000000004'::uuid, 'https://source.unsplash.com/random/1600x900/?apartment,interior,nepal&sig=104', true, 0),
  ('91000000-0000-4000-8000-000000000005'::uuid, '90000000-0000-4000-8000-000000000005'::uuid, 'https://source.unsplash.com/random/1600x900/?residential,building,nepal&sig=105', true, 0),
  ('91000000-0000-4000-8000-000000000006'::uuid, '90000000-0000-4000-8000-000000000006'::uuid, 'https://source.unsplash.com/random/1600x900/?pokhara,house,nepal&sig=106', true, 0),
  ('91000000-0000-4000-8000-000000000007'::uuid, '90000000-0000-4000-8000-000000000007'::uuid, 'https://source.unsplash.com/random/1600x900/?pokhara,apartment,view&sig=107', true, 0),
  ('91000000-0000-4000-8000-000000000008'::uuid, '90000000-0000-4000-8000-000000000008'::uuid, 'https://source.unsplash.com/random/1600x900/?commercial,land,road&sig=108', true, 0),
  ('91000000-0000-4000-8000-000000000009'::uuid, '90000000-0000-4000-8000-000000000009'::uuid, 'https://source.unsplash.com/random/1600x900/?family,home,nepal&sig=109', true, 0),
  ('91000000-0000-4000-8000-000000000010'::uuid, '90000000-0000-4000-8000-000000000010'::uuid, 'https://source.unsplash.com/random/1600x900/?empty,plot,city&sig=110', true, 0),
  ('91000000-0000-4000-8000-000000000011'::uuid, '90000000-0000-4000-8000-000000000011'::uuid, 'https://source.unsplash.com/random/1600x900/?suburban,house,exterior&sig=111', true, 0),
  ('91000000-0000-4000-8000-000000000012'::uuid, '90000000-0000-4000-8000-000000000012'::uuid, 'https://source.unsplash.com/random/1600x900/?urban,house,property&sig=112', true, 0),
  ('91000000-0000-4000-8000-000000000013'::uuid, '90000000-0000-4000-8000-000000000013'::uuid, 'https://source.unsplash.com/random/1600x900/?apartment,balcony,city&sig=113', true, 0),
  ('91000000-0000-4000-8000-000000000014'::uuid, '90000000-0000-4000-8000-000000000014'::uuid, 'https://source.unsplash.com/random/1600x900/?land,investment,nepal&sig=114', true, 0),
  ('91000000-0000-4000-8000-000000000015'::uuid, '90000000-0000-4000-8000-000000000015'::uuid, 'https://source.unsplash.com/random/1600x900/?highway,land,property&sig=115', true, 0),
  ('91000000-0000-4000-8000-000000000016'::uuid, '90000000-0000-4000-8000-000000000016'::uuid, 'https://source.unsplash.com/random/1600x900/?renovated,house,nepal&sig=116', true, 0),
  ('91000000-0000-4000-8000-000000000017'::uuid, '90000000-0000-4000-8000-000000000017'::uuid, 'https://source.unsplash.com/random/1600x900/?modern,house,front&sig=117', true, 0),
  ('91000000-0000-4000-8000-000000000018'::uuid, '90000000-0000-4000-8000-000000000018'::uuid, 'https://source.unsplash.com/random/1600x900/?hillside,landscape,property&sig=118', true, 0),
  ('91000000-0000-4000-8000-000000000019'::uuid, '90000000-0000-4000-8000-000000000019'::uuid, 'https://source.unsplash.com/random/1600x900/?riverside,land,development&sig=119', true, 0),
  ('91000000-0000-4000-8000-000000000020'::uuid, '90000000-0000-4000-8000-000000000020'::uuid, 'https://source.unsplash.com/random/1600x900/?apartment,tower,city&sig=120', true, 0);

INSERT INTO public.property_images (
  id,
  property_id,
  image_url,
  is_primary,
  display_order
)
SELECT
  si.image_id,
  si.property_id,
  si.image_url,
  si.is_primary,
  si.display_order
FROM md_seed_images si
WHERE EXISTS (
  SELECT 1
  FROM public.properties p
  WHERE p.id = si.property_id
)
AND NOT EXISTS (
  SELECT 1
  FROM public.property_images pi
  WHERE pi.id = si.image_id
);

COMMIT;
