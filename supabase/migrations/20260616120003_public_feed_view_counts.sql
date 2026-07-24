-- Compteurs de vues agrégés pour le feed public (lecture seule, pas de données brutes)

CREATE OR REPLACE FUNCTION public.get_public_resource_view_counts(
  p_resource_ids uuid[],
  p_event_type public.analytics_event_type
)
RETURNS TABLE(resource_id uuid, view_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.resource_id, COUNT(*)::bigint
  FROM entity_analytics_events e
  WHERE e.resource_id = ANY(p_resource_ids)
    AND e.event_type = p_event_type
    AND e.resource_id IS NOT NULL
  GROUP BY e.resource_id;
$$;

REVOKE ALL ON FUNCTION public.get_public_resource_view_counts(uuid[], public.analytics_event_type) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_resource_view_counts(uuid[], public.analytics_event_type) TO anon, authenticated;
