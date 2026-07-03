-- ============================================================
-- Seed — 1 event billetterie multi-activités pour le compte test14
-- slug profil : test14
-- entity_id  : 858b59ec-e035-48c6-82c5-61366232c514
--
-- Exécuter EN ENTIER dans Supabase SQL Editor (après migration event_activities).
-- Pour un autre profil : remplacer 'test14' dans le bloc target.
-- ============================================================

-- Nettoyage idempotent (IDs fixes de ce seed)
DELETE FROM order_lines WHERE id IN (
  'd6000000-0000-4000-8000-000000000001'
);
DELETE FROM event_registrations WHERE id IN (
  'd5000000-0000-4000-8000-000000000001',
  'd5000000-0000-4000-8000-000000000002',
  'd5000000-0000-4000-8000-000000000003'
);
DELETE FROM orders WHERE id IN (
  'd4000000-0000-4000-8000-000000000001'
);
DELETE FROM event_ticket_types WHERE id IN (
  'd2000000-0000-4000-8000-000000000001',
  'd2000000-0000-4000-8000-000000000002'
);
DELETE FROM event_activities WHERE id IN (
  'd3000000-0000-4000-8000-000000000001',
  'd3000000-0000-4000-8000-000000000002'
);
DELETE FROM events WHERE id = 'd1000000-0000-4000-8000-000000000001';

DO $$
DECLARE
  v_entity_id uuid;
BEGIN
  SELECT id INTO v_entity_id FROM entity WHERE slug = 'test14' LIMIT 1;
  IF v_entity_id IS NULL THEN
    RAISE EXCEPTION 'Profil introuvable : slug test14';
  END IF;

  INSERT INTO entity_menu_sections (entity_id, type, is_active, is_configured, position)
  VALUES (
    v_entity_id,
    'events',
    true,
    true,
    COALESCE(
      (SELECT MAX(position) FROM entity_menu_sections WHERE entity_id = v_entity_id),
      0
    ) + 1
  )
  ON CONFLICT (entity_id, type) DO UPDATE
  SET is_active = true, is_configured = true;

  INSERT INTO events (
    id, entity_id, title, slug, description,
    start_at, end_at, location_type, location_details,
    price_cents, currency, capacity, is_published,
    cancel_min_hours, registration_fields, position
  ) VALUES (
    'd1000000-0000-4000-8000-000000000001',
    v_entity_id,
    'Festival sport — test billetterie',
    'masterclass-visibilite-solo',
    'Event parent avec deux activités (foot et basket) pour tester la billetterie par créneau.',
    date_trunc('day', now()) + interval '1 day' + interval '10 hours',
    date_trunc('day', now()) + interval '1 day' + interval '18 hours',
    'in_person',
    'Complexe sportif IBEE',
    1900, 'EUR', 50, true, 24,
    '[{"id":"objectif","label":"Ton objectif principal","type":"select","required":true,"options":["Visibilité","Conversion","Réseau","Autre"]}]'::jsonb,
    0
  );

  INSERT INTO event_activities (
    id, event_id, entity_id, title, slug,
    start_at, end_at, location_type, location_details,
    capacity, position, is_published
  ) VALUES
    (
      'd3000000-0000-4000-8000-000000000001',
      'd1000000-0000-4000-8000-000000000001',
      v_entity_id,
      'Foot',
      'foot',
      date_trunc('day', now()) + interval '1 day' + interval '10 hours',
      date_trunc('day', now()) + interval '1 day' + interval '12 hours',
      'in_person',
      'Terrain A',
      25,
      0,
      true
    ),
    (
      'd3000000-0000-4000-8000-000000000002',
      'd1000000-0000-4000-8000-000000000001',
      v_entity_id,
      'Basket',
      'basket',
      date_trunc('day', now()) + interval '1 day' + interval '14 hours',
      date_trunc('day', now()) + interval '1 day' + interval '16 hours',
      'in_person',
      'Terrain B',
      25,
      1,
      true
    );

  INSERT INTO event_ticket_types (
    id, event_id, entity_id, activity_id, title, slug,
    price_cents, currency, sales_start_at, sales_end_at, quota, position, is_active
  ) VALUES
    (
      'd2000000-0000-4000-8000-000000000001',
      'd1000000-0000-4000-8000-000000000001',
      v_entity_id,
      'd3000000-0000-4000-8000-000000000001',
      'Early bird — Foot',
      'early-bird-foot',
      1500, 'EUR', now() - interval '3 days', now() + interval '2 days', 15, 0, true
    ),
    (
      'd2000000-0000-4000-8000-000000000002',
      'd1000000-0000-4000-8000-000000000001',
      v_entity_id,
      'd3000000-0000-4000-8000-000000000002',
      'Standard — Basket',
      'standard-basket',
      1900, 'EUR', NULL, NULL, NULL, 1, true
    );

  INSERT INTO event_registrations (
    id, event_id, entity_id, activity_id,
    attendee_name, attendee_email, attendee_phone, message,
    status, ticket_type_id, ticket_code, order_id, price_cents,
    form_answers, checked_in_at
  ) VALUES
    (
      'd5000000-0000-4000-8000-000000000001',
      'd1000000-0000-4000-8000-000000000001',
      v_entity_id,
      'd3000000-0000-4000-8000-000000000002',
      'Léa Bernard', 'lea.demo@ibee.test', '0611111111', NULL,
      'confirmed', 'd2000000-0000-4000-8000-000000000002', 'EVT-T14-NEW01', NULL, 1900,
      '{"objectif":"Visibilité"}'::jsonb, NULL
    ),
    (
      'd5000000-0000-4000-8000-000000000002',
      'd1000000-0000-4000-8000-000000000001',
      v_entity_id,
      'd3000000-0000-4000-8000-000000000001',
      'Marc Petit', 'marc.demo@ibee.test', NULL, 'Première session foot',
      'confirmed', 'd2000000-0000-4000-8000-000000000001', 'EVT-T14-NEW02', NULL, 1500,
      '{"objectif":"Conversion"}'::jsonb, NULL
    ),
    (
      'd5000000-0000-4000-8000-000000000003',
      'd1000000-0000-4000-8000-000000000001',
      v_entity_id,
      'd3000000-0000-4000-8000-000000000002',
      'Nina Roux', 'nina.demo@ibee.test', NULL, NULL,
      'cancelled', 'd2000000-0000-4000-8000-000000000002', 'EVT-T14-NEW03', NULL, 0,
      '{}'::jsonb, NULL
    );

  INSERT INTO orders (
    id, entity_id, order_number, buyer_name, buyer_email,
    status, fulfillment_status,
    order_kind, event_id, activity_id, event_ticket_type_id,
    subtotal_cents, discount_cents, shipping_cents, total_cents,
    currency, paid_at, stripe_payment_intent_id,
    form_answers
  ) VALUES (
    'd4000000-0000-4000-8000-000000000001',
    v_entity_id,
    generate_order_number(),
    'Léa Bernard', 'lea.demo@ibee.test',
    'paid', 'delivered',
    'event_ticket',
    'd1000000-0000-4000-8000-000000000001',
    'd3000000-0000-4000-8000-000000000002',
    'd2000000-0000-4000-8000-000000000002',
    1900, 0, 0, 1900, 'EUR',
    now() - interval '6 hours', 'pi_seed_test14_event_new',
    '{"objectif":"Visibilité"}'::jsonb
  );

  UPDATE event_registrations
  SET order_id = 'd4000000-0000-4000-8000-000000000001'
  WHERE id = 'd5000000-0000-4000-8000-000000000001';

  INSERT INTO order_lines (
    id, order_id, line_kind, event_id, event_ticket_type_id, registration_id,
    quantity, unit_price_cents, line_total_cents, title_snapshot
  ) VALUES (
    'd6000000-0000-4000-8000-000000000001',
    'd4000000-0000-4000-8000-000000000001',
    'event_ticket',
    'd1000000-0000-4000-8000-000000000001',
    'd2000000-0000-4000-8000-000000000002',
    'd5000000-0000-4000-8000-000000000001',
    1, 1900, 1900, 'Standard — Basket'
  );
END $$;

-- Vérification
SELECT
  e.title,
  e.slug,
  a.title AS activite,
  count(r.id) FILTER (WHERE r.status = 'confirmed') AS inscrits_confirmes
FROM events e
LEFT JOIN event_activities a ON a.event_id = e.id
LEFT JOIN event_registrations r ON r.activity_id = a.id
WHERE e.id = 'd1000000-0000-4000-8000-000000000001'
GROUP BY e.id, e.title, e.slug, a.id, a.title
ORDER BY a.position;
