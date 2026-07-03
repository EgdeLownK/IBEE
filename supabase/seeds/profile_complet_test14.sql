-- ============================================================
-- Seed profil complet — entity test14
-- id: 858b59ec-e035-48c6-82c5-61366232c514 | slug: test14
--
-- Enrichit : accueil (widgets), shop, service, events, news (5), histoire.
-- Images : picsum.photos (seeds fixes test14-*).
-- Compatible avec les seeds billetterie / service existants (IDs conservés).
--
-- Exécuter EN ENTIER dans Supabase SQL Editor.
-- ============================================================

-- Nettoyage idempotent (IDs fixes de ce seed uniquement)
DELETE FROM publication_media WHERE publication_id IN (
  'f2030000-0000-4000-8000-000000000001',
  'f2030000-0000-4000-8000-000000000002',
  'f2030000-0000-4000-8000-000000000003',
  'f2030000-0000-4000-8000-000000000004',
  'f2030000-0000-4000-8000-000000000005'
);
DELETE FROM publications WHERE id IN (
  'f2030000-0000-4000-8000-000000000001',
  'f2030000-0000-4000-8000-000000000002',
  'f2030000-0000-4000-8000-000000000003',
  'f2030000-0000-4000-8000-000000000004',
  'f2030000-0000-4000-8000-000000000005'
);
DELETE FROM product_media WHERE id IN (
  'f2011000-0000-4000-8000-000000000001',
  'f2011000-0000-4000-8000-000000000002',
  'f2011000-0000-4000-8000-000000000003',
  'f2011000-0000-4000-8000-000000000004'
);
DELETE FROM products WHERE id IN (
  'f2010000-0000-4000-8000-000000000001',
  'f2010000-0000-4000-8000-000000000002',
  'f2010000-0000-4000-8000-000000000003',
  'f2010000-0000-4000-8000-000000000004'
);
DELETE FROM entity_product_categories WHERE id IN (
  'f2012000-0000-4000-8000-000000000001',
  'f2012000-0000-4000-8000-000000000002'
);
DELETE FROM appointment_types WHERE id IN (
  'f2020000-0000-4000-8000-000000000002',
  'f2020000-0000-4000-8000-000000000003'
);
DELETE FROM entity_home_widgets WHERE entity_id = '858b59ec-e035-48c6-82c5-61366232c514';

-- ============================================================
-- 1. Profil hero
-- ============================================================
UPDATE entity SET
  display_name = 'Léa Fontaine',
  role = 'Consultante image & communication',
  location = 'Nantes, France',
  bio = 'J''aide les solopreneurs à être visibles, crédibles et mémorables — sans jargon d''agence. Personal branding, contenus et présence web : une marque personnelle claire, qui attire les bons clients.',
  avatar_url = 'https://picsum.photos/seed/test14-avatar/400/400',
  banner_url = 'https://picsum.photos/seed/test14-banner/1600/900'
WHERE slug = 'test14';

-- ============================================================
-- 2. Menus (6 onglets actifs)
-- ============================================================
INSERT INTO entity_menu_sections (entity_id, type, is_active, is_configured, position)
VALUES
  ('858b59ec-e035-48c6-82c5-61366232c514', 'home',         true, true, 0),
  ('858b59ec-e035-48c6-82c5-61366232c514', 'shop',         true, true, 1),
  ('858b59ec-e035-48c6-82c5-61366232c514', 'appointments', true, true, 2),
  ('858b59ec-e035-48c6-82c5-61366232c514', 'events',       true, true, 3),
  ('858b59ec-e035-48c6-82c5-61366232c514', 'news',         true, true, 4),
  ('858b59ec-e035-48c6-82c5-61366232c514', 'history',      true, true, 5)
ON CONFLICT (entity_id, type) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  is_configured = EXCLUDED.is_configured,
  position = EXCLUDED.position;

-- ============================================================
-- 3. Contact (widget Bio)
-- ============================================================
INSERT INTO entity_contact_info (
  entity_id,
  contact_email,
  contact_email_public,
  contact_phone,
  contact_phone_public,
  message_enabled,
  opening_hours_enabled,
  opening_hours
) VALUES (
  '858b59ec-e035-48c6-82c5-61366232c514',
  'contact@lea-fontaine-demo.ibee.test',
  true,
  '06 40 12 34 56',
  true,
  true,
  true,
  '[
    {"day_of_week":1,"closed":false,"start_time":"09:00","end_time":"18:00"},
    {"day_of_week":2,"closed":false,"start_time":"09:00","end_time":"18:00"},
    {"day_of_week":3,"closed":false,"start_time":"09:00","end_time":"18:00"},
    {"day_of_week":4,"closed":false,"start_time":"09:00","end_time":"18:00"},
    {"day_of_week":5,"closed":false,"start_time":"09:00","end_time":"17:00"},
    {"day_of_week":6,"closed":true,"start_time":null,"end_time":null},
    {"day_of_week":0,"closed":true,"start_time":null,"end_time":null}
  ]'::jsonb
)
ON CONFLICT (entity_id) DO UPDATE SET
  contact_email = EXCLUDED.contact_email,
  contact_phone = EXCLUDED.contact_phone,
  message_enabled = EXCLUDED.message_enabled,
  opening_hours_enabled = EXCLUDED.opening_hours_enabled,
  opening_hours = EXCLUDED.opening_hours;

-- ============================================================
-- 4. Histoire (6 blocs)
-- ============================================================
INSERT INTO entity_history (entity_id, content, blocks)
VALUES (
  '858b59ec-e035-48c6-82c5-61366232c514',
  '',
  $hist$[
    {
      "type": "text",
      "content": "Tout a commencé en 2018, après dix ans en agence de communication à Nantes. J''accompagnais des PME sur leur image de marque — logos, sites, campagnes — et je voyais les mêmes frustrations revenir : des indépendants brillants, invisibles parce que leur message était flou.\n\nJ''ai quitté le salariat pour créer mon activité solo : aider les solopreneurs à construire une présence pro claire, sans budget agence."
    },
    {
      "type": "image",
      "slot_count": 1,
      "images": [{"url": "https://picsum.photos/seed/test14-history-01/1200/675", "aspect_ratio": 1.777}]
    },
    {
      "type": "text",
      "content": "Ma mission aujourd''hui : te donner les outils pour être trouvable (Google, réseaux, IA), crédible (preuves, storytelling) et mémorable (ton, visuels, offre lisible). Pas de formule magique — une méthode concrète, testée avec plus de 120 clients en trois ans."
    },
    {
      "type": "image",
      "slot_count": 1,
      "images": [{"url": "https://picsum.photos/seed/test14-history-02/1080/1080", "aspect_ratio": 1}]
    },
    {
      "type": "text",
      "content": "Mes valeurs : clarté avant tout, authenticité (pas de personal branding « carton-pâte »), et résultats mesurables. Chaque accompagnement se termine par un livrable actionnable — pas un PDF qui prend la poussière."
    },
    {
      "type": "text",
      "content": "Sur ce profil IBEE tu trouves mes ressources (shop), mes prestations (service), mes ateliers (events) et mes réflexions (news). Bienvenue — et si tu veux aller plus loin, réserve un premier échange."
    }
  ]$hist$::jsonb
)
ON CONFLICT (entity_id) DO UPDATE SET
  content = EXCLUDED.content,
  blocks = EXCLUDED.blocks;

-- ============================================================
-- 5. Shop — catégories + 4 produits
-- ============================================================
INSERT INTO entity_product_categories (id, entity_id, name, position) VALUES
  ('f2012000-0000-4000-8000-000000000001', '858b59ec-e035-48c6-82c5-61366232c514', 'Guides & ressources', 0),
  ('f2012000-0000-4000-8000-000000000002', '858b59ec-e035-48c6-82c5-61366232c514', 'Éditions limitées', 1)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, position = EXCLUDED.position;

INSERT INTO products (
  id, entity_id, type, title, slug, description_short, category, category_id,
  price_cents, sale_price_cents, currency, status, published_at,
  digital_file_url, digital_file_format, digital_license,
  physical_condition, physical_pickup_location, pickup_enabled, delivery_enabled,
  content_blocks
) VALUES
(
  'f2010000-0000-4000-8000-000000000001',
  '858b59ec-e035-48c6-82c5-61366232c514',
  'digital',
  'Guide PDF — Kit visibilité solo',
  'kit-visibilite-solo',
  'Méthode pas à pas pour clarifier ton message et ta présence en ligne en 7 jours.',
  'Guides & ressources',
  'f2012000-0000-4000-8000-000000000001',
  2900, NULL, 'EUR', 'published', now() - interval '12 days',
  'https://example.com/mock/test14-kit-visibilite.pdf', 'pdf', 'personal',
  NULL, NULL, true, false,
  $p1$[
    {"type":"text","content":"Ce guide de 48 pages t''accompagne pour poser les fondations de ta visibilité : positionnement, promesse, preuves sociales et plan d''action sur une semaine."},
    {"type":"image","url":"https://picsum.photos/seed/test14-product-01/1080/800","alt":"Aperçu du guide Kit visibilité solo"},
    {"type":"text","content":"Tu y trouveras des exercices concrets, des exemples de bios efficaces et une checklist SEO/GEO pour ton profil IBEE. Format PDF, téléchargement immédiat après achat."}
  ]$p1$::jsonb
),
(
  'f2010000-0000-4000-8000-000000000002',
  '858b59ec-e035-48c6-82c5-61366232c514',
  'digital',
  'Pack Canva — Posts pro (30 modèles)',
  'pack-canva-posts-pro',
  '30 modèles éditables pour LinkedIn et Instagram, alignés sur une image de marque cohérente.',
  'Guides & ressources',
  'f2012000-0000-4000-8000-000000000001',
  1900, NULL, 'EUR', 'published', now() - interval '8 days',
  'https://example.com/mock/test14-pack-canva.zip', 'zip', 'professional',
  NULL, NULL, true, false,
  $p2$[
    {"type":"text","content":"Fini les posts bâclés : ce pack inclut des visuels carrés et paysage, des variantes citation / carrousel / annonce, et une palette de couleurs personnalisable."},
    {"type":"image","url":"https://picsum.photos/seed/test14-product-02/1080/800","alt":"Modèles Canva posts professionnels"},
    {"type":"text","content":"Compatible Canva Free et Pro. Idéal si tu veux publier régulièrement sans repartir de zéro à chaque fois."}
  ]$p2$::jsonb
),
(
  'f2010000-0000-4000-8000-000000000003',
  '858b59ec-e035-48c6-82c5-61366232c514',
  'physical',
  'Carnet de marque — édition Nantes 2026',
  'carnet-marque-nantes-2026',
  'Carnet A5 120 pages, couverture rigide, exercices de personal branding imprimés.',
  'Éditions limitées',
  'f2012000-0000-4000-8000-000000000002',
  2400, NULL, 'EUR', 'published', now() - interval '5 days',
  NULL, NULL, NULL,
  'new', 'Nantes — retrait sur RDV (Île de Nantes)', true, false,
  $p3$[
    {"type":"text","content":"Un carnet physique pour structurer ta réflexion : pages guidées sur ta cible, ton ton, tes preuves et ton plan de contenu. Édition limitée à 200 exemplaires numérotés."},
    {"type":"image","url":"https://picsum.photos/seed/test14-product-03/1080/800","alt":"Carnet de marque édition Nantes"},
    {"type":"text","content":"Retrait possible sur rendez-vous à Nantes ou envoi postal (frais en sus sur demande)."}
  ]$p3$::jsonb
),
(
  'f2010000-0000-4000-8000-000000000004',
  '858b59ec-e035-48c6-82c5-61366232c514',
  'physical',
  'Affiche A3 — Manifeste indépendant',
  'affiche-manifeste-independant',
  'Affiche typographique A3, impression locale, pour ton espace de travail.',
  'Éditions limitées',
  'f2012000-0000-4000-8000-000000000002',
  1800, 1500, 'EUR', 'published', now() - interval '3 days',
  NULL, NULL, NULL,
  'new', 'Nantes — retrait sur RDV', true, false,
  $p4$[
    {"type":"text","content":"« Visible sans tricher. Crédible sans copier. » — l''affiche qui rappelle pourquoi tu fais ce métier. Papier 250g, encres mates, signée en bas de planche."},
    {"type":"image","url":"https://picsum.photos/seed/test14-product-04/1080/800","alt":"Affiche manifeste indépendant"},
    {"type":"text","content":"Parfaite au-dessus d''un bureau ou dans une salle d''attente. Promo de lancement à 15 €."}
  ]$p4$::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description_short = EXCLUDED.description_short,
  price_cents = EXCLUDED.price_cents,
  sale_price_cents = EXCLUDED.sale_price_cents,
  status = EXCLUDED.status,
  content_blocks = EXCLUDED.content_blocks,
  category_id = EXCLUDED.category_id;

INSERT INTO product_media (id, product_id, url, media_type, display_order) VALUES
  ('f2011000-0000-4000-8000-000000000001', 'f2010000-0000-4000-8000-000000000001', 'https://picsum.photos/seed/test14-product-01/1080/1350', 'image', 0),
  ('f2011000-0000-4000-8000-000000000002', 'f2010000-0000-4000-8000-000000000002', 'https://picsum.photos/seed/test14-product-02/1080/1350', 'image', 0),
  ('f2011000-0000-4000-8000-000000000003', 'f2010000-0000-4000-8000-000000000003', 'https://picsum.photos/seed/test14-product-03/1080/1350', 'image', 0),
  ('f2011000-0000-4000-8000-000000000004', 'f2010000-0000-4000-8000-000000000004', 'https://picsum.photos/seed/test14-product-04/1080/1350', 'image', 0)
ON CONFLICT (id) DO UPDATE SET url = EXCLUDED.url;

-- ============================================================
-- 6. Services — enrichir l''existant + 2 nouvelles prestations
-- ============================================================
UPDATE appointment_types SET
  title = 'Audit image express — 45 min',
  description = 'Un diagnostic rapide de ta présence en ligne : profil, message, visuels et premières pistes d''amélioration.',
  duration_minutes = 45,
  location_type = 'video',
  location_details = 'Lien visio envoyé après confirmation',
  price_cents = 7900,
  currency = 'EUR',
  is_active = true,
  position = 0,
  color = '#6366f1',
  gallery_images = ARRAY['https://picsum.photos/seed/test14-service-01/1080/1350'],
  highlights = '["Lecture de ton profil IBEE ou LinkedIn","3 axes prioritaires","Plan d''action sous 48 h"]'::jsonb,
  content_blocks = $s1$[
    {"type":"text","content":"Tu as l''impression d''être bon dans ton métier mais invisible en ligne ? Cet audit express pose un diagnostic honnête et actionnable en 45 minutes."},
    {"type":"image","url":"https://picsum.photos/seed/test14-service-01/1080/800","alt":"Séance audit image en visio"},
    {"type":"text","content":"En fin de séance tu repars avec : un score de cohérence, trois leviers prioritaires et une recommandation de prestation si tu veux aller plus loin."}
  ]$s1$::jsonb
WHERE id = 'e1000000-0000-4000-8000-000000000001';

INSERT INTO appointment_types (
  id, entity_id, title, slug, description, duration_minutes,
  location_type, location_details, price_cents, currency,
  is_active, position, color, auto_accept_bookings, payment_required, min_notice_hours,
  gallery_images, highlights, content_blocks
) VALUES
(
  'f2020000-0000-4000-8000-000000000002',
  '858b59ec-e035-48c6-82c5-61366232c514',
  'Session stratégie personal branding — 90 min',
  'session-strategie-personal-branding',
  'Atelier individuel pour clarifier ton positionnement, ta promesse et ton plan de contenu sur 90 jours.',
  90, 'video', 'Google Meet — lien après réservation',
  14900, 'EUR', true, 1, '#8b5cf6', false, false, 24,
  ARRAY['https://picsum.photos/seed/test14-service-02/1080/1350'],
  '["Positionnement & cible","Promesse & preuves","Plan éditorial 90 jours"]'::jsonb,
  $s2$[
    {"type":"text","content":"La session la plus demandée : on part de ton métier réel, on identifie ce qui te différencie, et on construit un message clair que tu peux décliner partout (site, réseaux, pitch)."},
    {"type":"image","url":"https://picsum.photos/seed/test14-service-02/1080/800","alt":"Session stratégie personal branding"},
    {"type":"list","items":["Questionnaire préparatoire (15 min)","Cartographie cible / concurrence","Rédaction de ta promesse en une phrase","Feuille de route contenu 90 jours"]}
  ]$s2$::jsonb
),
(
  'f2020000-0000-4000-8000-000000000003',
  '858b59ec-e035-48c6-82c5-61366232c514',
  'Pack photos LinkedIn — visio + brief',
  'pack-photos-linkedin',
  'Brief créatif + retouche de 5 portraits pour ton profil pro (à partir de tes photos ou d''une séance guidée en visio).',
  60, 'video', 'Brief PDF + échanges visio',
  19900, 'EUR', true, 2, '#0ea5e9', false, false, 48,
  ARRAY['https://picsum.photos/seed/test14-service-03/1080/1350'],
  '["Brief style & posture","5 portraits retouchés","Formats LinkedIn & IBEE"]'::jsonb,
  $s3$[
    {"type":"text","content":"Ton visage est souvent le premier point de contact. Ce pack t''aide à avoir des photos cohérentes avec ton positionnement — sans shooting studio à 800 €."},
    {"type":"image","url":"https://picsum.photos/seed/test14-service-03/1080/800","alt":"Pack photos LinkedIn"},
    {"type":"text","content":"Tu m''envoies 10 à 15 photos (ou on fait une mini-séance guidée en visio), je sélectionne et retouche les 5 meilleures pour ton profil."}
  ]$s3$::jsonb
);

-- ============================================================
-- 7. Events — enrichir les events existants (billetterie demo)
-- ============================================================
UPDATE events SET
  description = 'Atelier présentiel à Nantes : clarifie ton personal branding en deux heures, repars avec un plan d''action concret.',
  gallery_images = ARRAY['https://picsum.photos/seed/test14-event-01/1080/1350'],
  highlights = '["Exercices en petit groupe","Feedback personnalisé","Support PDF inclus"]'::jsonb,
  content_blocks = $e1$[
    {"type":"text","content":"Un atelier intimiste (12 personnes max) pour poser les bases de ta marque personnelle : cible, promesse, preuves et premiers contenus à publier."},
    {"type":"image","url":"https://picsum.photos/seed/test14-event-01/1080/800","alt":"Atelier personal brand Nantes"},
    {"type":"text","content":"Prévoir un carnet et un accès à ton profil actuel (LinkedIn, site ou IBEE). Pause café offerte. Lieu : Bouillargues, accès 15 min depuis le centre de Nantes."}
  ]$e1$::jsonb,
  faq = '[
    {"question":"Faut-il un niveau minimum ?","answer":"Non. L''atelier s''adresse aux indépendants qui démarrent ou veulent clarifier une offre floue."},
    {"question":"Puis-je annuler ?","answer":"Oui, jusqu''à 24 h avant le début. Remboursement ou report selon ta préférence."}
  ]'::jsonb
WHERE id = 'c1000000-0000-4000-8000-000000000001'
  AND entity_id = '858b59ec-e035-48c6-82c5-61366232c514';

UPDATE events SET
  description = 'Conférence en ligne : comment structurer un profil web trouvable sur Google et cité par les assistants IA (ChatGPT, Perplexity).',
  gallery_images = ARRAY['https://picsum.photos/seed/test14-event-02/1080/1350'],
  highlights = '["SEO + GEO + AEO","Cas concrets solopreneurs","Q&R en direct"]'::jsonb,
  content_blocks = $e2$[
    {"type":"text","content":"La visibilité ne se limite plus à Google : les LLMs recommandent des profils structurés. Cette conférence te montre comment préparer ton site IBEE pour les deux."},
    {"type":"image","url":"https://picsum.photos/seed/test14-event-02/1080/800","alt":"Conférence visibilité web et IA"},
    {"type":"text","content":"Durée : 3 h avec pause. Enregistrement réservé aux inscrits premium. Lien Zoom envoyé 24 h avant."}
  ]$e2$::jsonb,
  faq = '[
    {"question":"Différence Standard / VIP ?","answer":"VIP inclut le replay à vie et un template de page profil optimisée SEO/GEO."},
    {"question":"Code promo ?","answer":"Le code EVENT20 donne 20 % sur le billet Standard (dans la limite des places)."}
  ]'::jsonb
WHERE id = 'c1000000-0000-4000-8000-000000000002'
  AND entity_id = '858b59ec-e035-48c6-82c5-61366232c514';

UPDATE events SET
  description = 'Festival sport & networking : deux créneaux (foot et basket) pour tester la billetterie multi-activités — contenu démo enrichi.',
  gallery_images = ARRAY['https://picsum.photos/seed/test14-event-03/1080/1350'],
  highlights = '["Foot ou basket au choix","Networking après séance","Places limitées par créneau"]'::jsonb,
  content_blocks = $e3$[
    {"type":"text","content":"Event parent avec deux activités : choisis ton créneau sportif puis profite d''un moment d''échange autour de la visibilité des profils pro (démo technique IBEE)."},
    {"type":"image","url":"https://picsum.photos/seed/test14-event-03/1080/800","alt":"Festival sport networking"},
    {"type":"text","content":"Tenue de sport recommandée. Vestiaires sur place. Billets nominatifs — QR code à présenter à l''entrée."}
  ]$e3$::jsonb,
  faq = '[
    {"question":"Puis-je m''inscrire aux deux activités ?","answer":"Oui, avec deux billets distincts si des places restent disponibles."}
  ]'::jsonb
WHERE id = 'd1000000-0000-4000-8000-000000000001'
  AND entity_id = '858b59ec-e035-48c6-82c5-61366232c514';

-- ============================================================
-- 8. News — 5 publications
-- ============================================================
INSERT INTO publications (id, entity_id, title, content, status, published_at) VALUES
(
  'f2030000-0000-4000-8000-000000000001',
  '858b59ec-e035-48c6-82c5-61366232c514',
  'Pourquoi ton profil LinkedIn ne suffit plus en 2026',
  'LinkedIn reste utile — mais ce n''est plus ton « site web ». Les clients te cherchent sur Google, dans ChatGPT, sur ton profil IBEE ou chez un concurrent mieux structuré.

Trois signaux que tu as besoin d''un hub pro à toi : tu répètes les mêmes infos sur cinq plateformes, tu n''as pas de page dédiée à tes offres, et aucun contenu indexable en dehors des réseaux.

Un profil IBEE complète LinkedIn : pages produits, services, events et articles que les moteurs (et les IA) peuvent lire. Ce n''est pas « un de plus » — c''est ta base, dont LinkedIn devient un relais.

Action cette semaine : note les trois questions qu''on te pose le plus souvent. Si tes réponses ne sont nulle part en ligne de façon claire, c''est le bon moment pour structurer ton profil.',
  'published', now() - interval '14 days'
),
(
  'f2030000-0000-4000-8000-000000000002',
  '858b59ec-e035-48c6-82c5-61366232c514',
  '3 erreurs de personal branding quand on est solo',
  'Erreur 1 : copier un guru du secteur. Tu gagnes en familiarité, tu perds en différenciation. Les clients achètent une personne, pas une photocopie.

Erreur 2 : tout dire à la fois. « Coach, formatrice, consultante, créatrice de contenu » — personne ne retient quoi. Une promesse principale, des offres secondaires en sous-pages.

Erreur 3 : attendre le logo parfait avant de publier. Le contenu clair bat le visuel moyen. Publie, mesure, ajuste.

Chez mes clientes, le déclic arrive souvent quand on réduit le message à une phrase testable : « J''aide [cible] à [résultat] grâce à [méthode]. » Essaie — et envoie-moi la tienne en commentaire si tu veux un retour.',
  'published', now() - interval '10 days'
),
(
  'f2030000-0000-4000-8000-000000000003',
  '858b59ec-e035-48c6-82c5-61366232c514',
  'Retour d''atelier : 12 participantes, 12 messages plus clairs',
  'Samedi dernier, atelier « Personal brand en 2 h » à Nantes. 12 participantes, des métiers variés : sophrologue, développeuse, architecte d''intérieur, consultante RH…

Le point commun : une expertise réelle, un discours flou. En fin de session, chacune est repartie avec une promesse en une phrase et trois idées de posts pour la semaine suivante.

Ce qui a le plus débloqué : l''exercice « preuves sociales » — lister 5 résultats concrets pour des clients, sans jargon. Souvent, le contenu du site est déjà dans la tête ; il manque juste la structure.

Prochaine date en ligne sur l''onglet Events. Les places partent vite — active la notification si tu suis mon profil.',
  'published', now() - interval '6 days'
),
(
  'f2030000-0000-4000-8000-000000000004',
  '858b59ec-e035-48c6-82c5-61366232c514',
  'Être cité par les IA : par où commencer',
  'ChatGPT et Perplexity ne « devinent » pas ton expertise : ils s''appuient sur du contenu structuré, des pages claires et des signaux de confiance (FAQ, avis, coordonnées, régularité).

Commence par : une page d''accueil qui dit qui tu aides et comment ; des pages détail pour chaque offre ; une FAQ honnête ; des articles (news) qui répondent aux vraies questions de ta cible.

Le GEO (Generative Engine Optimization) n''est pas de la magie : c''est du bon sens SEO + du contenu utile + une identité cohérente. IBEE est pensé pour ça — profil indexable, sections lisibles par les machines.

Je détaille tout ça dans la conférence du mois prochain (onglet Events). En attendant, publie une FAQ de 5 questions sur ton métier.',
  'published', now() - interval '3 days'
),
(
  'f2030000-0000-4000-8000-000000000005',
  '858b59ec-e035-48c6-82c5-61366232c514',
  'Coulisses : comment je prépare une séance client',
  'Avant chaque audit ou session stratégie, je demande : ton site actuel, ton réseau principal, et la dernière offre que tu as vendue (ou tenté de vendre).

Je bloque 20 minutes pour lire sans juger. Je note : incohérences de ton, trous dans le parcours client, preuves absentes. Pendant la séance, on ne refait pas tout — on priorise.

Après : un compte-rendu en 48 h, trois actions max pour les 14 jours suivants. Pas de rapport de 40 pages.

Cette rigueur, c''est ce que je vends. Si tu veux la même clarté sur ton profil, le pack « Audit image express » est ouvert (onglet Service).',
  'published', now() - interval '1 day'
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  status = EXCLUDED.status,
  published_at = EXCLUDED.published_at;

INSERT INTO publication_media (id, publication_id, type, url, position, alt_text) VALUES
  ('f2031000-0000-4000-8000-000000000001', 'f2030000-0000-4000-8000-000000000001', 'image', 'https://picsum.photos/seed/test14-news-01/1080/1350', 0, 'Profil professionnel en ligne'),
  ('f2031000-0000-4000-8000-000000000002', 'f2030000-0000-4000-8000-000000000002', 'image', 'https://picsum.photos/seed/test14-news-02/1080/1350', 0, 'Personal branding solo'),
  ('f2031000-0000-4000-8000-000000000003', 'f2030000-0000-4000-8000-000000000003', 'image', 'https://picsum.photos/seed/test14-news-03/1080/1350', 0, 'Atelier personal brand Nantes'),
  ('f2031000-0000-4000-8000-000000000004', 'f2030000-0000-4000-8000-000000000004', 'image', 'https://picsum.photos/seed/test14-news-04/1080/1350', 0, 'Visibilité IA et moteurs'),
  ('f2031000-0000-4000-8000-000000000005', 'f2030000-0000-4000-8000-000000000005', 'image', 'https://picsum.photos/seed/test14-news-05/1080/1350', 0, 'Préparation séance client')
ON CONFLICT (id) DO UPDATE SET url = EXCLUDED.url, alt_text = EXCLUDED.alt_text;

-- ============================================================
-- 9. Accueil — widgets
-- ============================================================
INSERT INTO entity_home_widgets (id, entity_id, type, is_active, position, config) VALUES
(
  'f2040000-0000-4000-8000-000000000003',
  '858b59ec-e035-48c6-82c5-61366232c514',
  'widget_highlight',
  true, 0,
  '{"mode":"single","item":{"kind":"product","id":"f2010000-0000-4000-8000-000000000001"}}'::jsonb
),
(
  'f2040000-0000-4000-8000-000000000004',
  '858b59ec-e035-48c6-82c5-61366232c514',
  'widget_carousel',
  true, 1,
  '{"mode":"collection","source_kind":"services","limit":6}'::jsonb
),
(
  'f2040000-0000-4000-8000-000000000005',
  '858b59ec-e035-48c6-82c5-61366232c514',
  'widget_carousel',
  true, 2,
  '{"mode":"collection","source_kind":"events","limit":3}'::jsonb
),
(
  'f2040000-0000-4000-8000-000000000006',
  '858b59ec-e035-48c6-82c5-61366232c514',
  'widget_carousel',
  true, 3,
  '{"mode":"collection","source_kind":"news","limit":3}'::jsonb
),
(
  'f2040000-0000-4000-8000-000000000007',
  '858b59ec-e035-48c6-82c5-61366232c514',
  'widget_faq',
  true, 4,
  '{"mode":"menu"}'::jsonb
),
(
  'f2040000-0000-4000-8000-000000000002',
  '858b59ec-e035-48c6-82c5-61366232c514',
  'widget_bio',
  true, 5,
  '{"mode":"profile"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  type = EXCLUDED.type,
  is_active = EXCLUDED.is_active,
  position = EXCLUDED.position,
  config = EXCLUDED.config;
