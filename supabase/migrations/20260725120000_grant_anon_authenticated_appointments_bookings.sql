-- Meme classe de derive que 20260724110000 / 20260725090000 : ces tables
-- (domaine appointments/bookings, creees mi-avril 2026) ont toujours eu leurs
-- GRANT de base poses manuellement en prod, jamais captures en migration.
-- Pas detecte plus tot faute de test pgTAP sur ce domaine -- decouvert en
-- ajoutant bookings_rls.test.sql (CI: "permission denied for table bookings"
-- sur une base rejouee depuis zero).
grant select, insert, update, delete on table
  public.appointment_types,
  public.availability_schedules,
  public.availability_exceptions,
  public.bookings
  to anon, authenticated;
