-- Fonction trigger générique déjà présente en prod (créée manuellement, jamais
-- capturée dans une migration — découvert le 24/07 en rejouant les migrations
-- depuis zéro pour la première fois via `supabase start` en CI). Utilisée par
-- 20260415200000_appointments_system.sql et d'autres migrations ultérieures.
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
