-- Même classe de dérive que 20260724110000 (migration Lot 1) : ces tables ont
-- été créées début juillet 2026, période où les GRANT de base ont été posés
-- manuellement en prod sans jamais être capturés en migration. Découvert en
-- rejouant les migrations depuis zéro pour les tests pgTAP du Lot 2.
grant select, insert, update, delete on table
  public.entity_job_applications,
  public.entity_job_offers,
  public.entity_payout_schedules,
  public.entity_payout_allocations,
  public.entity_payout_transfers
  to anon, authenticated;
