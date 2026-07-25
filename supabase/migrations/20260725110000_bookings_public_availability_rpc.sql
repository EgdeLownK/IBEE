-- La policy "bookings_owner_select" a ete trouvee ouverte en USING (true)
-- pour anon/authenticated directement en prod (jamais migre), exposant
-- l'integralite de la table bookings (nom, email, telephone du client) a
-- n'importe quel visiteur non authentifie. Corrige en prod via ALTER POLICY
-- pour revenir au scoping owner prevu par la migration d'origine
-- (20260416100000_fix_bookings_rls.sql).
--
-- Cette derive existait pour une raison fonctionnelle reelle : le calcul
-- des creneaux disponibles sur la page de reservation publique
-- (getAvailableSlots, packages/supabase/src/availability.ts) lit
-- bookings.start_at/end_at en tant que visiteur anonyme pour exclure les
-- creneaux deja pris. Avec la policy correctement scopee owner, ce flux
-- anonyme n'a plus acces a ces lignes.
--
-- Remplace par une fonction SECURITY DEFINER qui n'expose que les creneaux
-- occupes (start_at/end_at), jamais les donnees du client (nom, email,
-- telephone, message) -- meme pattern que count_event_activity_holds /
-- count_event_registrations.

ALTER POLICY "bookings_owner_select" ON public.bookings
  USING (
    EXISTS (
      SELECT 1 FROM entity
      WHERE entity.id = bookings.entity_id AND entity.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.get_booked_time_ranges(
  p_entity_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
RETURNS TABLE(start_at timestamptz, end_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT b.start_at, b.end_at
  FROM bookings b
  WHERE b.entity_id = p_entity_id
    AND b.status IN ('pending', 'confirmed')
    AND b.start_at >= p_from
    AND b.start_at <= p_to;
$$;

GRANT EXECUTE ON FUNCTION public.get_booked_time_ranges(uuid, timestamptz, timestamptz) TO anon, authenticated;
