-- ============================================================
-- Seed billetterie demo — entity test14
-- id: 858b59ec-e035-48c6-82c5-61366232c514
-- slug: test14
--
-- Exécuter EN ENTIER dans Supabase SQL Editor.
-- Si erreur : copier le message exact (le script s'arrête au premier bloc).
-- ============================================================

-- 0. Nettoyage d'un seed précédent raté (IDs fixes du demo)
DELETE FROM order_lines WHERE id IN (
  'c6000000-0000-4000-8000-000000000001',
  'c6000000-0000-4000-8000-000000000002'
);
DELETE FROM event_registrations WHERE id IN (
  'c5000000-0000-4000-8000-000000000001',
  'c5000000-0000-4000-8000-000000000002',
  'c5000000-0000-4000-8000-000000000003',
  'c5000000-0000-4000-8000-000000000004',
  'c5000000-0000-4000-8000-000000000005',
  'c5000000-0000-4000-8000-000000000006'
);
DELETE FROM orders WHERE id IN (
  'c4000000-0000-4000-8000-000000000001',
  'c4000000-0000-4000-8000-000000000002'
);
DELETE FROM event_ticket_types WHERE id IN (
  'c2000000-0000-4000-8000-000000000001',
  'c2000000-0000-4000-8000-000000000002',
  'c2000000-0000-4000-8000-000000000003',
  'c2000000-0000-4000-8000-000000000004'
);
DELETE FROM discount_codes WHERE id = 'c3000000-0000-4000-8000-000000000001';
DELETE FROM events WHERE id IN (
  'c1000000-0000-4000-8000-000000000001',
  'c1000000-0000-4000-8000-000000000002'
);

-- ============================================================
-- 1. Events
-- ============================================================
INSERT INTO events (
  id, entity_id, title, slug, description,
  start_at, end_at, location_type, location_details,
  price_cents, currency, capacity, is_published,
  cancel_min_hours, registration_fields
) VALUES (
  'c1000000-0000-4000-8000-000000000001',
  '858b59ec-e035-48c6-82c5-61366232c514',
  'Atelier demo — Check-in IBEE',
  'atelier-demo-checkin',
  'Event de test pour scanner les billets le jour J.',
  date_trunc('day', now()) + interval '18 hours',
  date_trunc('day', now()) + interval '20 hours',
  'in_person',
  'Bouillargues',
  2500, 'EUR', 30, true, 24,
  '[{"id":"org","label":"Organisation","type":"text","required":false},{"id":"vege","label":"Repas végétarien","type":"checkbox","required":false}]'::jsonb
);

INSERT INTO events (
  id, entity_id, title, slug, description,
  start_at, end_at, location_type, location_details,
  price_cents, currency, capacity, is_published,
  cancel_min_hours, registration_fields
) VALUES (
  'c1000000-0000-4000-8000-000000000002',
  '858b59ec-e035-48c6-82c5-61366232c514',
  'Conférence demo — Billetterie complète',
  'conference-demo-billetterie',
  'Event de test : types de billets, promo, annulations.',
  now() + interval '12 days',
  now() + interval '12 days' + interval '3 hours',
  'online',
  'Lien Zoom après inscription',
  4900, 'EUR', 50, true, 48,
  '[{"id":"role","label":"Ton métier","type":"select","required":true,"options":["Coach","Consultant","Créatif","Autre"]}]'::jsonb
);

-- ============================================================
-- 2. Types de billets
-- ============================================================
INSERT INTO event_ticket_types (
  id, event_id, entity_id, title, slug,
  price_cents, currency, sales_start_at, sales_end_at, quota, position, is_active
) VALUES
  ('c2000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000002', '858b59ec-e035-48c6-82c5-61366232c514',
   'Early bird', 'early-bird', 3900, 'EUR', now() - interval '7 days', now() + interval '5 days', 10, 0, true),
  ('c2000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000002', '858b59ec-e035-48c6-82c5-61366232c514',
   'Standard', 'standard', 4900, 'EUR', NULL, NULL, NULL, 1, true),
  ('c2000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000002', '858b59ec-e035-48c6-82c5-61366232c514',
   'Invité', 'invite', 0, 'EUR', NULL, NULL, 5, 2, true),
  ('c2000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000001', '858b59ec-e035-48c6-82c5-61366232c514',
   'Entrée', 'entree', 2500, 'EUR', NULL, NULL, NULL, 0, true);

-- ============================================================
-- 3. Code promo (ignore si déjà présent sur l'entity)
-- ============================================================
INSERT INTO discount_codes (
  id, entity_id, code, type, value,
  min_purchase_cents, max_uses_total, applies_to, is_active
) VALUES (
  'c3000000-0000-4000-8000-000000000001',
  '858b59ec-e035-48c6-82c5-61366232c514',
  'EVENT20', 'percentage', 20,
  1000, 100, 'all_events', true
)
ON CONFLICT (entity_id, code) DO NOTHING;

-- ============================================================
-- 4. Commandes payantes
-- ============================================================
INSERT INTO orders (
  id, entity_id, order_number, buyer_name, buyer_email,
  status, fulfillment_status,
  order_kind, event_id, event_ticket_type_id,
  subtotal_cents, discount_cents, shipping_cents, total_cents,
  currency, paid_at, stripe_payment_intent_id,
  form_answers, discount_code_id
) VALUES (
  'c4000000-0000-4000-8000-000000000001',
  '858b59ec-e035-48c6-82c5-61366232c514',
  generate_order_number(),
  'Alice Martin', 'alice.demo@ibee.test',
  'paid', 'delivered',
  'event_ticket', 'c1000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000000002',
  4900, 980, 0, 3920, 'EUR',
  now() - interval '2 days', 'pi_seed_test14_001',
  '{"role":"Coach"}'::jsonb,
  (SELECT id FROM discount_codes WHERE entity_id = '858b59ec-e035-48c6-82c5-61366232c514' AND code = 'EVENT20' LIMIT 1)
);

INSERT INTO orders (
  id, entity_id, order_number, buyer_name, buyer_email,
  status, fulfillment_status,
  order_kind, event_id, event_ticket_type_id,
  subtotal_cents, discount_cents, shipping_cents, total_cents,
  currency, paid_at, stripe_payment_intent_id,
  form_answers
) VALUES (
  'c4000000-0000-4000-8000-000000000002',
  '858b59ec-e035-48c6-82c5-61366232c514',
  generate_order_number(),
  'Bob Dupont', 'bob.demo@ibee.test',
  'paid', 'delivered',
  'event_ticket', 'c1000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000004',
  2500, 0, 0, 2500, 'EUR',
  now() - interval '3 hours', 'pi_seed_test14_002',
  '{"org":"Freelance","vege":true}'::jsonb
);

-- ============================================================
-- 5. Inscriptions (AVANT order_lines)
-- ============================================================
INSERT INTO event_registrations (
  id, event_id, entity_id,
  attendee_name, attendee_email, attendee_phone, message,
  status, ticket_type_id, ticket_code, order_id, price_cents,
  form_answers, checked_in_at
) VALUES
  ('c5000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000002', '858b59ec-e035-48c6-82c5-61366232c514',
   'Alice Martin', 'alice.demo@ibee.test', '0600000001', NULL,
   'confirmed', 'c2000000-0000-4000-8000-000000000002', 'EVT-T14-DEMO01', 'c4000000-0000-4000-8000-000000000001', 3920,
   '{"role":"Coach"}'::jsonb, NULL),
  ('c5000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001', '858b59ec-e035-48c6-82c5-61366232c514',
   'Bob Dupont', 'bob.demo@ibee.test', '0600000002', NULL,
   'confirmed', 'c2000000-0000-4000-8000-000000000004', 'EVT-T14-DEMO02', 'c4000000-0000-4000-8000-000000000002', 2500,
   '{"org":"Freelance","vege":true}'::jsonb, now() - interval '45 minutes'),
  ('c5000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000001', '858b59ec-e035-48c6-82c5-61366232c514',
   'Claire Leroy', 'claire.demo@ibee.test', NULL, 'Première fois !',
   'confirmed', 'c2000000-0000-4000-8000-000000000004', 'EVT-T14-DEMO03', NULL, 2500,
   '{"org":"SAS"}'::jsonb, NULL),
  ('c5000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000001', '858b59ec-e035-48c6-82c5-61366232c514',
   'David Noir', 'david.demo@ibee.test', NULL, NULL,
   'cancelled', 'c2000000-0000-4000-8000-000000000004', 'EVT-T14-DEMO04', NULL, 0,
   '{}'::jsonb, NULL),
  ('c5000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000002', '858b59ec-e035-48c6-82c5-61366232c514',
   'Emma Vert', 'emma.demo@ibee.test', '0600000005', NULL,
   'confirmed', 'c2000000-0000-4000-8000-000000000001', 'EVT-T14-DEMO05', NULL, 3900,
   '{"role":"Consultant"}'::jsonb, NULL),
  ('c5000000-0000-4000-8000-000000000006', 'c1000000-0000-4000-8000-000000000002', '858b59ec-e035-48c6-82c5-61366232c514',
   'Fabien Guest', 'fabien.demo@ibee.test', NULL, 'Invité speaker',
   'confirmed', 'c2000000-0000-4000-8000-000000000003', 'EVT-T14-DEMO06', NULL, 0,
   '{"role":"Créatif"}'::jsonb, NULL);

-- ============================================================
-- 6. Lignes de commande
-- ============================================================
INSERT INTO order_lines (
  id, order_id, line_kind, event_id, event_ticket_type_id, registration_id,
  quantity, unit_price_cents, line_total_cents, title_snapshot
) VALUES
  ('c6000000-0000-4000-8000-000000000001', 'c4000000-0000-4000-8000-000000000001', 'event_ticket',
   'c1000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000000002', 'c5000000-0000-4000-8000-000000000001',
   1, 4900, 3920, 'Standard — Conférence demo'),
  ('c6000000-0000-4000-8000-000000000002', 'c4000000-0000-4000-8000-000000000002', 'event_ticket',
   'c1000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000004', 'c5000000-0000-4000-8000-000000000002',
   1, 2500, 2500, 'Entrée — Atelier demo check-in');

-- ============================================================
-- 7. Vérification
-- ============================================================
SELECT count(*) AS inscriptions FROM event_registrations
WHERE entity_id = '858b59ec-e035-48c6-82c5-61366232c514';
-- attendu : 6
