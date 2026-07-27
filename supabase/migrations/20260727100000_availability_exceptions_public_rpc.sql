-- La policy "availability_exceptions_public_read" est ouverte en USING (true)
-- pour anon/authenticated, exposant l'integralite de la table (toutes les
-- entities, toutes les dates, y compris le champ libre `reason`) a
-- n'importe quel visiteur non authentifie. Table vide en production au
-- moment du correctif (0 ligne verifiee) : aucune donnee n'a fuite.
--
-- Le seul besoin reel est le calcul des creneaux disponibles sur la page de
-- reservation publique (getAvailableSlots, packages/supabase/src/
-- availability.ts), qui ne lit que is_blocked/start_time/end_time pour UNE
-- entity_id et UNE date. Remplace par une fonction SECURITY DEFINER qui ne
-- retourne que ces 3 colonnes -- meme pattern que get_booked_time_ranges
-- (migration 20260725110000_bookings_public_availability_rpc.sql).
--
-- p_date est un parametre obligatoire (pas de defaut, pas de NULL implicite) :
-- une comparaison `= NULL` en SQL ne matche jamais aucune ligne, donc un
-- appel avec p_date NULL renvoie un ensemble vide plutot que la table
-- entiere. La policy owner ("availability_exceptions_owner_all") n'est pas
-- touchee : l'owner continue de lire/ecrire ses propres exceptions sans
-- passer par cette RPC.

CREATE OR REPLACE FUNCTION public.get_availability_exception_for_date(
  p_entity_id uuid,
  p_date date
)
RETURNS TABLE(is_blocked boolean, start_time time, end_time time)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ae.is_blocked, ae.start_time, ae.end_time
  FROM availability_exceptions ae
  WHERE ae.entity_id = p_entity_id
    AND ae.date = p_date;
$$;

GRANT EXECUTE ON FUNCTION public.get_availability_exception_for_date(uuid, date) TO anon, authenticated;

DROP POLICY "availability_exceptions_public_read" ON public.availability_exceptions;
