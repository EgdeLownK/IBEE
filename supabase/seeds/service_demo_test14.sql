-- ============================================================
-- Seed service demo — entity test14
-- id: 858b59ec-e035-48c6-82c5-61366232c514
-- slug: test14
--
-- Exécuter EN ENTIER dans Supabase SQL Editor.
-- Crée 1 prestation + 4 rendez-vous (dont 2 aujourd'hui) pour tester
-- l'onglet Service → Rendez-vous (agenda + fiche client).
-- ============================================================

-- 0. Nettoyage d'un seed précédent (IDs fixes du demo)
DELETE FROM bookings WHERE id IN (
  'f1000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000002',
  'f1000000-0000-4000-8000-000000000003',
  'f1000000-0000-4000-8000-000000000004'
);

DELETE FROM clients
WHERE entity_id = '858b59ec-e035-48c6-82c5-61366232c514'
  AND lower(email) IN (
    'marie.demo@ibee.test',
    'pierre.demo@ibee.test',
    'sophie.demo@ibee.test'
  );

DELETE FROM availability_schedules WHERE id IN (
  'e2000000-0000-4000-8000-000000000001',
  'e2000000-0000-4000-8000-000000000002',
  'e2000000-0000-4000-8000-000000000003',
  'e2000000-0000-4000-8000-000000000004',
  'e2000000-0000-4000-8000-000000000005'
);

DELETE FROM appointment_types WHERE id = 'e1000000-0000-4000-8000-000000000001';

-- ============================================================
-- 1. Prestation (consultation demo)
-- ============================================================
INSERT INTO appointment_types (
  id,
  entity_id,
  title,
  slug,
  description,
  duration_minutes,
  location_type,
  location_details,
  price_cents,
  currency,
  is_active,
  position,
  color,
  auto_accept_bookings,
  payment_required,
  min_notice_hours
) VALUES (
  'e1000000-0000-4000-8000-000000000001',
  '858b59ec-e035-48c6-82c5-61366232c514',
  'Consultation demo — 45 min',
  'consultation-demo-45',
  'Prestation de test pour le module Service (agenda, fiche client, actions).',
  45,
  'video',
  'Lien visio envoyé après confirmation',
  7900,
  'EUR',
  true,
  0,
  '#6366f1',
  false,
  false,
  0
);

-- ============================================================
-- 2. Horaires hebdo (lun–ven 9h–18h) — onglet Planning
-- day_of_week : 0=dim … 1=lun … 6=sam
-- ============================================================
INSERT INTO availability_schedules (id, entity_id, day_of_week, start_time, end_time) VALUES
  ('e2000000-0000-4000-8000-000000000001', '858b59ec-e035-48c6-82c5-61366232c514', 1, '09:00', '18:00'),
  ('e2000000-0000-4000-8000-000000000002', '858b59ec-e035-48c6-82c5-61366232c514', 2, '09:00', '18:00'),
  ('e2000000-0000-4000-8000-000000000003', '858b59ec-e035-48c6-82c5-61366232c514', 3, '09:00', '18:00'),
  ('e2000000-0000-4000-8000-000000000004', '858b59ec-e035-48c6-82c5-61366232c514', 4, '09:00', '18:00'),
  ('e2000000-0000-4000-8000-000000000005', '858b59ec-e035-48c6-82c5-61366232c514', 5, '09:00', '18:00');

-- ============================================================
-- 3. Rendez-vous
-- Les clients sont créés automatiquement (trigger upsert_client_from_booking).
-- ============================================================

-- Aujourd'hui 10h — à confirmer (Marie)
INSERT INTO bookings (
  id,
  appointment_type_id,
  entity_id,
  booker_name,
  booker_email,
  booker_phone,
  booker_message,
  start_at,
  end_at,
  status,
  price_cents,
  currency,
  payment_status,
  source
) VALUES (
  'f1000000-0000-4000-8000-000000000001',
  'e1000000-0000-4000-8000-000000000001',
  '858b59ec-e035-48c6-82c5-61366232c514',
  'Marie Dupont',
  'marie.demo@ibee.test',
  '06 12 34 56 78',
  'Première prise de contact — souhaite clarifier son offre avant de lancer son profil IBEE.',
  date_trunc('day', now()) + interval '10 hours',
  date_trunc('day', now()) + interval '10 hours 45 minutes',
  'pending',
  7900,
  'EUR',
  'unpaid',
  'seed'
);

-- Aujourd'hui 15h — confirmé (Pierre, 2e RDV même client email que Marie? non, different)
INSERT INTO bookings (
  id,
  appointment_type_id,
  entity_id,
  booker_name,
  booker_email,
  booker_phone,
  booker_message,
  start_at,
  end_at,
  status,
  price_cents,
  currency,
  payment_status,
  source
) VALUES (
  'f1000000-0000-4000-8000-000000000002',
  'e1000000-0000-4000-8000-000000000001',
  '858b59ec-e035-48c6-82c5-61366232c514',
  'Pierre Martin',
  'pierre.demo@ibee.test',
  '07 98 76 54 32',
  NULL,
  date_trunc('day', now()) + interval '15 hours',
  date_trunc('day', now()) + interval '15 hours 45 minutes',
  'confirmed',
  7900,
  'EUR',
  'unpaid',
  'seed'
);

-- Demain 11h — confirmé (Sophie)
INSERT INTO bookings (
  id,
  appointment_type_id,
  entity_id,
  booker_name,
  booker_email,
  booker_phone,
  start_at,
  end_at,
  status,
  price_cents,
  currency,
  payment_status,
  source
) VALUES (
  'f1000000-0000-4000-8000-000000000003',
  'e1000000-0000-4000-8000-000000000001',
  '858b59ec-e035-48c6-82c5-61366232c514',
  'Sophie Bernard',
  'sophie.demo@ibee.test',
  NULL,
  date_trunc('day', now()) + interval '1 day' + interval '11 hours',
  date_trunc('day', now()) + interval '1 day' + interval '11 hours 45 minutes',
  'confirmed',
  7900,
  'EUR',
  'unpaid',
  'seed'
);

-- Dans 3 jours 9h30 — à confirmer (Marie, 2e RDV pour historique client)
INSERT INTO bookings (
  id,
  appointment_type_id,
  entity_id,
  booker_name,
  booker_email,
  booker_phone,
  booker_message,
  start_at,
  end_at,
  status,
  price_cents,
  currency,
  payment_status,
  source
) VALUES (
  'f1000000-0000-4000-8000-000000000004',
  'e1000000-0000-4000-8000-000000000001',
  '858b59ec-e035-48c6-82c5-61366232c514',
  'Marie Dupont',
  'marie.demo@ibee.test',
  '06 12 34 56 78',
  'Suivi — revue du profil publié.',
  date_trunc('day', now()) + interval '3 days' + interval '9 hours 30 minutes',
  date_trunc('day', now()) + interval '3 days' + interval '10 hours 15 minutes',
  'pending',
  7900,
  'EUR',
  'unpaid',
  'seed'
);

-- Notes internes sur Marie (client auto-créé)
UPDATE clients
SET notes = 'Cliente demo — préfère les créneaux matin, très réactive par email.'
WHERE entity_id = '858b59ec-e035-48c6-82c5-61366232c514'
  AND lower(email) = 'marie.demo@ibee.test';

-- ============================================================
-- 4. Vérification
-- ============================================================
SELECT
  b.id,
  b.status,
  b.booker_name,
  b.start_at AT TIME ZONE 'Europe/Paris' AS start_paris
FROM bookings b
WHERE b.entity_id = '858b59ec-e035-48c6-82c5-61366232c514'
  AND b.id IN (
    'f1000000-0000-4000-8000-000000000001',
    'f1000000-0000-4000-8000-000000000002',
    'f1000000-0000-4000-8000-000000000003',
    'f1000000-0000-4000-8000-000000000004'
  )
ORDER BY b.start_at;
-- attendu : 4 lignes
