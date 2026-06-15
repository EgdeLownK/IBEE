-- =============================================================================
-- Analytics aggregations — comptages SQL pour dashboard Analyse (Phase C)
-- =============================================================================

CREATE OR REPLACE FUNCTION count_analytics_events(
  p_entity_id uuid,
  p_event_types analytics_event_type[],
  p_from timestamptz,
  p_to timestamptz,
  p_section_type menu_section_type DEFAULT NULL,
  p_resource_id uuid DEFAULT NULL
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT count(*)::bigint
  FROM entity_analytics_events e
  WHERE e.entity_id = p_entity_id
    AND e.event_type = ANY (p_event_types)
    AND e.occurred_at >= p_from
    AND e.occurred_at <= p_to
    AND (p_section_type IS NULL OR e.section_type = p_section_type)
    AND (p_resource_id IS NULL OR e.resource_id = p_resource_id);
$$;

CREATE OR REPLACE FUNCTION count_analytics_distinct_visitors(
  p_entity_id uuid,
  p_event_types analytics_event_type[],
  p_from timestamptz,
  p_to timestamptz,
  p_section_type menu_section_type DEFAULT NULL,
  p_resource_id uuid DEFAULT NULL
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT count(DISTINCT coalesce(e.visitor_key, e.id::text))::bigint
  FROM entity_analytics_events e
  WHERE e.entity_id = p_entity_id
    AND e.event_type = ANY (p_event_types)
    AND e.occurred_at >= p_from
    AND e.occurred_at <= p_to
    AND (p_section_type IS NULL OR e.section_type = p_section_type)
    AND (p_resource_id IS NULL OR e.resource_id = p_resource_id);
$$;

CREATE OR REPLACE FUNCTION group_analytics_by_section(
  p_entity_id uuid,
  p_event_types analytics_event_type[],
  p_from timestamptz,
  p_to timestamptz
)
RETURNS TABLE(section_type menu_section_type, event_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT e.section_type, count(*)::bigint AS event_count
  FROM entity_analytics_events e
  WHERE e.entity_id = p_entity_id
    AND e.event_type = ANY (p_event_types)
    AND e.occurred_at >= p_from
    AND e.occurred_at <= p_to
    AND e.section_type IS NOT NULL
  GROUP BY e.section_type;
$$;

CREATE OR REPLACE FUNCTION group_analytics_by_resource(
  p_entity_id uuid,
  p_event_types analytics_event_type[],
  p_from timestamptz,
  p_to timestamptz
)
RETURNS TABLE(resource_id uuid, event_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT e.resource_id, count(*)::bigint AS event_count
  FROM entity_analytics_events e
  WHERE e.entity_id = p_entity_id
    AND e.event_type = ANY (p_event_types)
    AND e.occurred_at >= p_from
    AND e.occurred_at <= p_to
    AND e.resource_id IS NOT NULL
  GROUP BY e.resource_id;
$$;

CREATE OR REPLACE FUNCTION analytics_event_bucket_index(
  p_period text,
  p_from timestamptz,
  p_to timestamptz,
  p_occurred_at timestamptz
)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_period = 'week' THEN
      greatest(
        0,
        least(
          6,
          floor(
            extract(
              epoch FROM (date_trunc('day', p_occurred_at) - date_trunc('day', p_from))
            ) / 86400
          )::int
        )
      )
    WHEN p_period = 'month' THEN
      greatest(
        0,
        least(
          greatest(0, ceil(extract(day FROM p_to)::numeric / 7)::int - 1),
          floor((extract(day FROM p_occurred_at) - 1) / 7)::int
        )
      )
    WHEN p_period = 'year' THEN
      (extract(month FROM p_occurred_at)::int - 1)
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION bucket_analytics_events(
  p_entity_id uuid,
  p_event_types analytics_event_type[],
  p_from timestamptz,
  p_to timestamptz,
  p_period text,
  p_section_type menu_section_type DEFAULT NULL,
  p_resource_id uuid DEFAULT NULL
)
RETURNS TABLE(bucket_index int, event_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    analytics_event_bucket_index(p_period, p_from, p_to, e.occurred_at) AS bucket_index,
    count(*)::bigint AS event_count
  FROM entity_analytics_events e
  WHERE e.entity_id = p_entity_id
    AND e.event_type = ANY (p_event_types)
    AND e.occurred_at >= p_from
    AND e.occurred_at <= p_to
    AND (p_section_type IS NULL OR e.section_type = p_section_type)
    AND (p_resource_id IS NULL OR e.resource_id = p_resource_id)
  GROUP BY 1;
$$;

CREATE OR REPLACE FUNCTION bucket_analytics_distinct_visitors(
  p_entity_id uuid,
  p_event_types analytics_event_type[],
  p_from timestamptz,
  p_to timestamptz,
  p_period text,
  p_section_type menu_section_type DEFAULT NULL,
  p_resource_id uuid DEFAULT NULL
)
RETURNS TABLE(bucket_index int, event_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    analytics_event_bucket_index(p_period, p_from, p_to, e.occurred_at) AS bucket_index,
    count(DISTINCT coalesce(e.visitor_key, e.id::text))::bigint AS event_count
  FROM entity_analytics_events e
  WHERE e.entity_id = p_entity_id
    AND e.event_type = ANY (p_event_types)
    AND e.occurred_at >= p_from
    AND e.occurred_at <= p_to
    AND (p_section_type IS NULL OR e.section_type = p_section_type)
    AND (p_resource_id IS NULL OR e.resource_id = p_resource_id)
  GROUP BY 1;
$$;

GRANT EXECUTE ON FUNCTION count_analytics_events TO authenticated;
GRANT EXECUTE ON FUNCTION count_analytics_distinct_visitors TO authenticated;
GRANT EXECUTE ON FUNCTION group_analytics_by_section TO authenticated;
GRANT EXECUTE ON FUNCTION group_analytics_by_resource TO authenticated;
GRANT EXECUTE ON FUNCTION bucket_analytics_events TO authenticated;
GRANT EXECUTE ON FUNCTION bucket_analytics_distinct_visitors TO authenticated;
