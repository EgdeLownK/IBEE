-- =============================================================================
-- Optimisation : remplacer follow_timestamps (array brut N éléments) par
-- member_buckets (agrégat SQL bucket_index → count).
--
-- Avant : jsonb_agg(f.created_at) → N timestamps transférés → bucketTimestamps() en TS
-- Après : GROUP BY analytics_event_bucket_index() → M buckets (7 / 5 / 12 max) en SQL
--
-- La fonction analytics_event_bucket_index() est IMMUTABLE, disponible depuis
-- 20260613120000_analytics_aggregations.sql.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_analyse_web_data(
  p_entity_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_prev_from timestamptz,
  p_prev_to timestamptz,
  p_period text
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'visitors_cur',
      count_analytics_distinct_visitors(
        p_entity_id, ARRAY['profile_view']::analytics_event_type[], p_from, p_to, NULL, NULL
      ),
    'visitors_prev',
      count_analytics_distinct_visitors(
        p_entity_id, ARRAY['profile_view']::analytics_event_type[], p_prev_from, p_prev_to, NULL, NULL
      ),
    'members_cur',
      (SELECT count(*)::bigint FROM follows f
        WHERE f.followed_entity_id = p_entity_id
          AND f.created_at >= p_from AND f.created_at <= p_to),
    'members_prev',
      (SELECT count(*)::bigint FROM follows f
        WHERE f.followed_entity_id = p_entity_id
          AND f.created_at >= p_prev_from AND f.created_at <= p_prev_to),
    'unsubscribed_cur',
      count_analytics_events_hybrid(
        p_entity_id, ARRAY['unfollow']::analytics_event_type[], p_from, p_to, NULL, NULL
      ),
    'unsubscribed_prev',
      count_analytics_events_hybrid(
        p_entity_id, ARRAY['unfollow']::analytics_event_type[], p_prev_from, p_prev_to, NULL, NULL
      ),
    'section_counts',
      COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object('section_type', g.section_type, 'count', g.event_count)
          ORDER BY g.event_count DESC
        )
        FROM group_analytics_by_section_hybrid(
          p_entity_id, ARRAY['section_view']::analytics_event_type[], p_from, p_to
        ) g),
        '[]'::jsonb
      ),
    'visitor_buckets',
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('bucket_index', b.bucket_index, 'value', b.event_count))
        FROM bucket_analytics_distinct_visitors_hybrid(
          p_entity_id, ARRAY['profile_view']::analytics_event_type[], p_from, p_to, p_period, NULL, NULL
        ) b),
        '[]'::jsonb
      ),
    'unsubscribed_buckets',
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('bucket_index', b.bucket_index, 'value', b.event_count))
        FROM bucket_analytics_events_hybrid(
          p_entity_id, ARRAY['unfollow']::analytics_event_type[], p_from, p_to, p_period, NULL, NULL
        ) b),
        '[]'::jsonb
      ),
    'member_buckets',
      COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object('bucket_index', b.bucket_index, 'value', b.cnt)
          ORDER BY b.bucket_index
        )
        FROM (
          SELECT
            analytics_event_bucket_index(p_period, p_from, p_to, f.created_at) AS bucket_index,
            count(*)::bigint AS cnt
          FROM follows f
          WHERE f.followed_entity_id = p_entity_id
            AND f.created_at >= p_from
            AND f.created_at <= p_to
          GROUP BY 1
        ) b),
        '[]'::jsonb
      )
  );
$$;
