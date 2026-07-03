-- ============================================================
-- Seed : données mock pour le feed vertical (home /)
-- Produits, events et services publiés avec images.
-- Idempotent : UUID fixes + ON CONFLICT DO UPDATE.
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1. Entités créateurs mock
-- ---------------------------------------------------------------------------
INSERT INTO entity (id, slug, display_name, bio, avatar_url, role, location)
VALUES
  (
    'e1000000-0000-4000-8000-000000000001',
    'demo-lena',
    'Léna Martin',
    'Coach carrière & leadership pour indépendants.',
    'https://picsum.photos/seed/ibee-avatar-lena/400/400',
    'Coach',
    'Lyon'
  ),
  (
    'e1000000-0000-4000-8000-000000000002',
    'demo-atelier-nord',
    'Atelier Nord',
    'Céramique artisanale et ateliers créatifs.',
    'https://picsum.photos/seed/ibee-avatar-nord/400/400',
    'Artisan',
    'Lille'
  ),
  (
    'e1000000-0000-4000-8000-000000000003',
    'demo-studio-pixel',
    'Studio Pixel',
    'Photographe & retouche pour marques personnelles.',
    'https://picsum.photos/seed/ibee-avatar-pixel/400/400',
    'Photographe',
    'Bordeaux'
  ),
  (
    'e1000000-0000-4000-8000-000000000004',
    'demo-marco-formations',
    'Marco Formations',
    'Formations business pour solopreneurs.',
    'https://picsum.photos/seed/ibee-avatar-marco/400/400',
    'Formateur',
    'Paris'
  )
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  bio = EXCLUDED.bio,
  avatar_url = EXCLUDED.avatar_url,
  role = EXCLUDED.role,
  location = EXCLUDED.location;

-- Avatar killian si absent (profils feed)
UPDATE entity
SET avatar_url = COALESCE(avatar_url, 'https://picsum.photos/seed/ibee-avatar-killian/400/400')
WHERE slug = 'killian';

-- ---------------------------------------------------------------------------
-- 2. Produits (physical + digital) avec product_media
-- ---------------------------------------------------------------------------
INSERT INTO products (
  id, entity_id, type, title, slug, description_short, category,
  price_cents, sale_price_cents, currency, status, published_at,
  digital_file_url, digital_file_format,
  physical_condition, physical_pickup_location, pickup_enabled
)
VALUES
  -- Léna
  (
    'a1000000-0000-4000-8000-000000000001',
    'e1000000-0000-4000-8000-000000000001',
    'digital',
    'Guide PDF — Premiers 100 clients',
    'guide-premiers-100-clients',
    'Méthode pas à pas pour trouver tes premiers clients en solo.',
    'Formation',
    2900, NULL, 'EUR', 'published', now() - interval '1 day',
    'https://example.com/mock/guide-premiers-100-clients.pdf', 'pdf',
    NULL, NULL, true
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    'e1000000-0000-4000-8000-000000000001',
    'physical',
    'Carnet de coaching édition limitée',
    'carnet-coaching-limite',
    'Carnet A5 120 pages, couverture rigide, édition numérotée.',
    'Papeterie',
    1800, 1500, 'EUR', 'published', now() - interval '3 days',
    NULL, NULL,
    'new', 'Lyon 3e — retrait sur rendez-vous', true
  ),
  -- Atelier Nord
  (
    'a1000000-0000-4000-8000-000000000003',
    'e1000000-0000-4000-8000-000000000002',
    'physical',
    'Bol en grès émaillé — collection Hiver',
    'bol-gres-hiver',
    'Bol artisanal tourné à la main, émail mat sable.',
    'Céramique',
    4500, NULL, 'EUR', 'published', now() - interval '5 days',
    NULL, NULL,
    'new', 'Atelier Nord, Lille — click & collect', true
  ),
  (
    'a1000000-0000-4000-8000-000000000004',
    'e1000000-0000-4000-8000-000000000002',
    'digital',
    'Templates Canva — Vitrine artisan',
    'templates-canva-artisan',
    '12 modèles pour présenter ton atelier sur les réseaux.',
    'Templates',
    1900, NULL, 'EUR', 'published', now() - interval '7 days',
    'https://example.com/mock/templates-canva-artisan.zip', 'zip',
    NULL, NULL, true
  ),
  -- Studio Pixel
  (
    'a1000000-0000-4000-8000-000000000005',
    'e1000000-0000-4000-8000-000000000003',
    'physical',
    'Tirage photo 30×40 — série Urbaine',
    'tirage-urbaine-30x40',
    'Tirage argentique sur papier baryté, signé et numéroté.',
    'Art',
    3500, NULL, 'EUR', 'published', now() - interval '9 days',
    NULL, NULL,
    'like_new', 'Studio Pixel, Bordeaux — retrait en boutique', true
  ),
  (
    'a1000000-0000-4000-8000-000000000006',
    'e1000000-0000-4000-8000-000000000003',
    'digital',
    'Pack presets Lightroom — Portrait pro',
    'presets-lightroom-portrait',
    '8 presets pour un rendu portrait naturel et lumineux.',
    'Photo',
    990, NULL, 'EUR', 'published', now() - interval '11 days',
    'https://example.com/mock/presets-lightroom-portrait.zip', 'zip',
    NULL, NULL, true
  ),
  -- Marco Formations
  (
    'a1000000-0000-4000-8000-000000000007',
    'e1000000-0000-4000-8000-000000000004',
    'physical',
    'Manuel imprimé — Pricing pour indés',
    'manuel-pricing-indes',
    'Manuel 80 pages : fixer ses tarifs sans sous-valoriser.',
    'Livre',
    2200, NULL, 'EUR', 'published', now() - interval '13 days',
    NULL, NULL,
    'new', 'Paris 11e — retrait en librairie partenaire', true
  ),
  (
    'a1000000-0000-4000-8000-000000000008',
    'e1000000-0000-4000-8000-000000000004',
    'digital',
    'Formation vidéo — Lancer en 30 jours',
    'formation-lancer-30-jours',
    '6 modules vidéo pour structurer ton lancement produit.',
    'Formation',
    4900, 3900, 'EUR', 'published', now() - interval '15 days',
    'https://example.com/mock/formation-lancer-30-jours.mp4', 'mp4',
    NULL, NULL, true
  ),
  -- Killian (entité seed existante)
  (
    'a1000000-0000-4000-8000-000000000009',
    (SELECT id FROM entity WHERE slug = 'killian'),
    'digital',
    'Playbook IBEE — Profil web qui convertit',
    'playbook-profil-web',
    'Checklist SEO/GEO pour un profil IBEE performant.',
    'Guide',
    1500, NULL, 'EUR', 'published', now() - interval '2 days',
    'https://example.com/mock/playbook-profil-web.pdf', 'pdf',
    NULL, NULL, true
  ),
  (
    'a1000000-0000-4000-8000-00000000000a',
    (SELECT id FROM entity WHERE slug = 'killian'),
    'physical',
    'T-shirt IBEE — édition fondateur',
    'tshirt-ibee-fondateur',
    'Coton bio, coupe unisexe, logo brodé.',
    'Merch',
    2500, NULL, 'EUR', 'published', now() - interval '4 days',
    NULL, NULL,
    'new', 'Paris — envoi ou retrait sur RDV', true
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description_short = EXCLUDED.description_short,
  price_cents = EXCLUDED.price_cents,
  sale_price_cents = EXCLUDED.sale_price_cents,
  status = EXCLUDED.status,
  published_at = EXCLUDED.published_at;

INSERT INTO product_media (id, product_id, url, media_type, display_order)
VALUES
  ('d1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'https://picsum.photos/seed/ibee-feed-product-01/1080/1350', 'image', 0),
  ('d1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 'https://picsum.photos/seed/ibee-feed-product-02/1080/1350', 'image', 0),
  ('d1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', 'https://picsum.photos/seed/ibee-feed-product-03/1080/1350', 'image', 0),
  ('d1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', 'https://picsum.photos/seed/ibee-feed-product-04/1080/1350', 'image', 0),
  ('d1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000005', 'https://picsum.photos/seed/ibee-feed-product-05/1080/1350', 'image', 0),
  ('d1000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-000000000006', 'https://picsum.photos/seed/ibee-feed-product-06/1080/1350', 'image', 0),
  ('d1000000-0000-4000-8000-000000000007', 'a1000000-0000-4000-8000-000000000007', 'https://picsum.photos/seed/ibee-feed-product-07/1080/1350', 'image', 0),
  ('d1000000-0000-4000-8000-000000000008', 'a1000000-0000-4000-8000-000000000008', 'https://picsum.photos/seed/ibee-feed-product-08/1080/1350', 'image', 0),
  ('d1000000-0000-4000-8000-000000000009', 'a1000000-0000-4000-8000-000000000009', 'https://picsum.photos/seed/ibee-feed-product-09/1080/1350', 'image', 0),
  ('d1000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-00000000000a', 'https://picsum.photos/seed/ibee-feed-product-10/1080/1350', 'image', 0)
ON CONFLICT (id) DO UPDATE SET
  url = EXCLUDED.url,
  media_type = EXCLUDED.media_type,
  display_order = EXCLUDED.display_order;

-- ---------------------------------------------------------------------------
-- 3. Events à venir (gallery_images)
-- ---------------------------------------------------------------------------
INSERT INTO events (
  id, entity_id, title, slug, description, start_at, end_at,
  location_type, location_details, price_cents, currency,
  capacity, is_published, gallery_images, created_at
)
VALUES
  (
    'b1000000-0000-4000-8000-000000000001',
    'e1000000-0000-4000-8000-000000000001',
    'Webinaire — Trouver sa niche en 90 min',
    'webinaire-niche-90min',
    'Atelier live pour clarifier ton positionnement.',
    now() + interval '10 days',
    now() + interval '10 days' + interval '90 minutes',
    'online', 'Lien Zoom envoyé après inscription',
    0, 'EUR', 50, true,
    ARRAY['https://picsum.photos/seed/ibee-feed-event-01/1080/1350'],
    now() - interval '1 day'
  ),
  (
    'b1000000-0000-4000-8000-000000000002',
    'e1000000-0000-4000-8000-000000000002',
    'Atelier céramique — Initiation tournage',
    'atelier-ceramique-initiation',
    'Découvre le tour et repars avec ta première pièce.',
    now() + interval '18 days',
    now() + interval '18 days' + interval '3 hours',
    'in_person', '12 rue des Arts, Lille',
    6500, 'EUR', 8, true,
    ARRAY['https://picsum.photos/seed/ibee-feed-event-02/1080/1350'],
    now() - interval '4 days'
  ),
  (
    'b1000000-0000-4000-8000-000000000003',
    'e1000000-0000-4000-8000-000000000003',
    'Meetup photo — Lumière naturelle',
    'meetup-lumiere-naturelle',
    'Session pratique en extérieur avec retours personnalisés.',
    now() + interval '25 days',
    now() + interval '25 days' + interval '2 hours',
    'in_person', 'Parc Bordelais, Bordeaux',
    1500, 'EUR', 15, true,
    ARRAY['https://picsum.photos/seed/ibee-feed-event-03/1080/1350'],
    now() - interval '6 days'
  ),
  (
    'b1000000-0000-4000-8000-000000000004',
    'e1000000-0000-4000-8000-000000000004',
    'Masterclass live — Offre irrésistible',
    'masterclass-offre-irresistible',
    'Construis une offre claire qui vend sans forcer.',
    now() + interval '32 days',
    now() + interval '32 days' + interval '2 hours',
    'online', 'Google Meet — lien après inscription',
    2900, 'EUR', NULL, true,
    ARRAY['https://picsum.photos/seed/ibee-feed-event-04/1080/1350'],
    now() - interval '8 days'
  ),
  (
    'b1000000-0000-4000-8000-000000000005',
    (SELECT id FROM entity WHERE slug = 'killian'),
    'Session Agora — Profils web & visibilité',
    'session-agora-visibilite',
    'Échanges ouverts sur le référencement des profils IBEE.',
    now() + interval '14 days',
    now() + interval '14 days' + interval '60 minutes',
    'online', 'Lien communauté Agora',
    0, 'EUR', 100, true,
    ARRAY['https://picsum.photos/seed/ibee-feed-event-05/1080/1350'],
    now() - interval '3 days'
  ),
  (
    'b1000000-0000-4000-8000-000000000006',
    'e1000000-0000-4000-8000-000000000001',
    'Workshop — Pitch en 5 minutes',
    'workshop-pitch-5-minutes',
    'Entraîne ton pitch devant un petit groupe bienveillant.',
    now() + interval '21 days',
    now() + interval '21 days' + interval '2 hours',
    'in_person', 'Coworking Lyon Part-Dieu',
    3500, 'EUR', 12, true,
    ARRAY['https://picsum.photos/seed/ibee-feed-event-06/1080/1350'],
    now() - interval '10 days'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  start_at = EXCLUDED.start_at,
  end_at = EXCLUDED.end_at,
  is_published = EXCLUDED.is_published,
  gallery_images = EXCLUDED.gallery_images,
  created_at = EXCLUDED.created_at;

-- ---------------------------------------------------------------------------
-- 4. Services (appointment_types) avec gallery_images
-- ---------------------------------------------------------------------------
INSERT INTO appointment_types (
  id, entity_id, title, slug, description, duration_minutes,
  location_type, price_cents, promo_price_cents, currency,
  is_active, gallery_images, created_at
)
VALUES
  (
    'c1000000-0000-4000-8000-000000000001',
    'e1000000-0000-4000-8000-000000000001',
    'Consultation carrière — 60 min',
    'consultation-carriere-60',
    'Point d''étape sur ton positionnement et ta stratégie client.',
    60, 'video', 12000, NULL, 'EUR', true,
    ARRAY['https://picsum.photos/seed/ibee-feed-service-01/1080/1350'],
    now() - interval '2 days'
  ),
  (
    'c1000000-0000-4000-8000-000000000002',
    'e1000000-0000-4000-8000-000000000002',
    'Séance découverte atelier',
    'seance-decouverte-atelier',
    'Visite de l''atelier et mini-démo sur le tour.',
    45, 'in_person', 0, NULL, 'EUR', true,
    ARRAY['https://picsum.photos/seed/ibee-feed-service-02/1080/1350'],
    now() - interval '5 days'
  ),
  (
    'c1000000-0000-4000-8000-000000000003',
    'e1000000-0000-4000-8000-000000000003',
    'Retouche express — 3 photos',
    'retouche-express-3-photos',
    'Retouche colorimétrique légère sur 3 images.',
    30, 'video', 4500, 3900, 'EUR', true,
    ARRAY['https://picsum.photos/seed/ibee-feed-service-03/1080/1350'],
    now() - interval '7 days'
  ),
  (
    'c1000000-0000-4000-8000-000000000004',
    'e1000000-0000-4000-8000-000000000004',
    'Audit stratégie business',
    'audit-strategie-business',
    'Analyse de ton offre, pricing et tunnel de vente.',
    90, 'video', 18000, NULL, 'EUR', true,
    ARRAY['https://picsum.photos/seed/ibee-feed-service-04/1080/1350'],
    now() - interval '9 days'
  ),
  (
    'c1000000-0000-4000-8000-000000000005',
    (SELECT id FROM entity WHERE slug = 'killian'),
    'Call fondateur — 30 min',
    'call-fondateur-30',
    'Échange direct sur ton profil IBEE et ta visibilité.',
    30, 'video', 0, NULL, 'EUR', true,
    ARRAY['https://picsum.photos/seed/ibee-feed-service-05/1080/1350'],
    now() - interval '4 days'
  ),
  (
    'c1000000-0000-4000-8000-000000000006',
    'e1000000-0000-4000-8000-000000000002',
    'Coaching créatif — 90 min',
    'coaching-creatif-90',
    'Accompagnement sur ta ligne artistique et ta vitrine.',
    90, 'in_person', 9500, NULL, 'EUR', true,
    ARRAY['https://picsum.photos/seed/ibee-feed-service-06/1080/1350'],
    now() - interval '12 days'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  price_cents = EXCLUDED.price_cents,
  promo_price_cents = EXCLUDED.promo_price_cents,
  is_active = EXCLUDED.is_active,
  gallery_images = EXCLUDED.gallery_images,
  created_at = EXCLUDED.created_at;

-- ---------------------------------------------------------------------------
-- 5. Compteurs de vues mock (feed action bar)
-- ---------------------------------------------------------------------------
INSERT INTO entity_analytics_events (entity_id, event_type, resource_id, visitor_key, occurred_at)
SELECT * FROM (VALUES
  ('e1000000-0000-4000-8000-000000000001'::uuid, 'product_view'::analytics_event_type, 'a1000000-0000-4000-8000-000000000001'::uuid, 'mock-visitor-1', now() - interval '2 hours'),
  ('e1000000-0000-4000-8000-000000000001'::uuid, 'product_view'::analytics_event_type, 'a1000000-0000-4000-8000-000000000001'::uuid, 'mock-visitor-2', now() - interval '1 hour'),
  ('e1000000-0000-4000-8000-000000000001'::uuid, 'product_view'::analytics_event_type, 'a1000000-0000-4000-8000-000000000001'::uuid, 'mock-visitor-3', now() - interval '30 minutes'),
  ('e1000000-0000-4000-8000-000000000002'::uuid, 'product_view'::analytics_event_type, 'a1000000-0000-4000-8000-000000000003'::uuid, 'mock-visitor-4', now() - interval '3 hours'),
  ('e1000000-0000-4000-8000-000000000002'::uuid, 'product_view'::analytics_event_type, 'a1000000-0000-4000-8000-000000000003'::uuid, 'mock-visitor-5', now() - interval '2 hours'),
  ('e1000000-0000-4000-8000-000000000001'::uuid, 'event_view'::analytics_event_type, 'b1000000-0000-4000-8000-000000000001'::uuid, 'mock-visitor-6', now() - interval '4 hours'),
  ('e1000000-0000-4000-8000-000000000001'::uuid, 'event_view'::analytics_event_type, 'b1000000-0000-4000-8000-000000000001'::uuid, 'mock-visitor-7', now() - interval '1 hour'),
  ('e1000000-0000-4000-8000-000000000003'::uuid, 'service_view'::analytics_event_type, 'c1000000-0000-4000-8000-000000000003'::uuid, 'mock-visitor-8', now() - interval '5 hours'),
  ('e1000000-0000-4000-8000-000000000003'::uuid, 'service_view'::analytics_event_type, 'c1000000-0000-4000-8000-000000000003'::uuid, 'mock-visitor-9', now() - interval '2 hours'),
  ('e1000000-0000-4000-8000-000000000003'::uuid, 'service_view'::analytics_event_type, 'c1000000-0000-4000-8000-000000000003'::uuid, 'mock-visitor-10', now() - interval '1 hour')
) AS v(entity_id, event_type, resource_id, visitor_key, occurred_at)
WHERE NOT EXISTS (
  SELECT 1 FROM entity_analytics_events e
  WHERE e.visitor_key = v.visitor_key
    AND e.resource_id = v.resource_id
    AND e.event_type = v.event_type
);
