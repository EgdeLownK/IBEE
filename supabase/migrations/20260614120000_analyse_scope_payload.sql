-- =============================================================================
-- Analyse dashboard — 1 RPC par scope (Niveau 2)
-- Retourne les métriques brutes en JSONB ; le formatage UI reste côté TS.
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
      count_analytics_events(
        p_entity_id, ARRAY['unfollow']::analytics_event_type[], p_from, p_to, NULL, NULL
      ),
    'unsubscribed_prev',
      count_analytics_events(
        p_entity_id, ARRAY['unfollow']::analytics_event_type[], p_prev_from, p_prev_to, NULL, NULL
      ),
    'section_counts',
      COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object('section_type', g.section_type, 'count', g.event_count)
          ORDER BY g.event_count DESC
        )
        FROM group_analytics_by_section(
          p_entity_id, ARRAY['section_view']::analytics_event_type[], p_from, p_to
        ) g),
        '[]'::jsonb
      ),
    'visitor_buckets',
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('bucket_index', b.bucket_index, 'value', b.event_count))
        FROM bucket_analytics_distinct_visitors(
          p_entity_id, ARRAY['profile_view']::analytics_event_type[], p_from, p_to, p_period, NULL, NULL
        ) b),
        '[]'::jsonb
      ),
    'unsubscribed_buckets',
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('bucket_index', b.bucket_index, 'value', b.event_count))
        FROM bucket_analytics_events(
          p_entity_id, ARRAY['unfollow']::analytics_event_type[], p_from, p_to, p_period, NULL, NULL
        ) b),
        '[]'::jsonb
      ),
    'follow_timestamps',
      COALESCE(
        (SELECT jsonb_agg(f.created_at ORDER BY f.created_at)
        FROM follows f
        WHERE f.followed_entity_id = p_entity_id
          AND f.created_at >= p_from AND f.created_at <= p_to),
        '[]'::jsonb
      )
  );
$$;

CREATE OR REPLACE FUNCTION get_analyse_service_data(
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
    'views_cur',
      count_analytics_distinct_visitors(
        p_entity_id, ARRAY['service_view']::analytics_event_type[], p_from, p_to, NULL, NULL
      ),
    'views_prev',
      count_analytics_distinct_visitors(
        p_entity_id, ARRAY['service_view']::analytics_event_type[], p_prev_from, p_prev_to, NULL, NULL
      ),
    'bookings_cur',
      COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object(
            'id', b.id,
            'created_at', b.created_at,
            'status', b.status,
            'appointment_type_id', b.appointment_type_id,
            'appointment_type_title', at.title
          )
          ORDER BY b.created_at
        )
        FROM bookings b
        LEFT JOIN appointment_types at ON at.id = b.appointment_type_id
        WHERE b.entity_id = p_entity_id
          AND b.created_at >= p_from AND b.created_at <= p_to),
        '[]'::jsonb
      ),
    'bookings_prev',
      COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object('status', b.status)
        )
        FROM bookings b
        WHERE b.entity_id = p_entity_id
          AND b.created_at >= p_prev_from AND b.created_at <= p_prev_to),
        '[]'::jsonb
      )
  );
$$;

CREATE OR REPLACE FUNCTION get_analyse_shop_data(
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
    'views_cur',
      count_analytics_events(
        p_entity_id, ARRAY['product_view']::analytics_event_type[], p_from, p_to, NULL, NULL
      ),
    'views_prev',
      count_analytics_events(
        p_entity_id, ARRAY['product_view']::analytics_event_type[], p_prev_from, p_prev_to, NULL, NULL
      ),
    'wishlist_cur',
      count_analytics_events(
        p_entity_id, ARRAY['wishlist_add']::analytics_event_type[], p_from, p_to, NULL, NULL
      ),
    'wishlist_prev',
      count_analytics_events(
        p_entity_id, ARRAY['wishlist_add']::analytics_event_type[], p_prev_from, p_prev_to, NULL, NULL
      ),
    'resource_counts',
      COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object('resource_id', g.resource_id, 'count', g.event_count)
          ORDER BY g.event_count DESC
        )
        FROM group_analytics_by_resource(
          p_entity_id, ARRAY['product_view']::analytics_event_type[], p_from, p_to
        ) g),
        '[]'::jsonb
      ),
    'products',
      COALESCE(
        (SELECT jsonb_object_agg(p.id::text, p.title)
        FROM products p
        WHERE p.entity_id = p_entity_id),
        '{}'::jsonb
      ),
    'wishlist_buckets',
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('bucket_index', b.bucket_index, 'value', b.event_count))
        FROM bucket_analytics_events(
          p_entity_id, ARRAY['wishlist_add']::analytics_event_type[], p_from, p_to, p_period, NULL, NULL
        ) b),
        '[]'::jsonb
      )
  );
$$;

CREATE OR REPLACE FUNCTION get_analyse_event_data(
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
    'registrations_cur',
      COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'created_at', r.created_at,
            'status', r.status,
            'event_id', r.event_id,
            'event_title', e.title,
            'event_capacity', e.capacity
          )
          ORDER BY r.created_at
        )
        FROM event_registrations r
        LEFT JOIN events e ON e.id = r.event_id
        WHERE r.entity_id = p_entity_id
          AND r.created_at >= p_from AND r.created_at <= p_to),
        '[]'::jsonb
      ),
    'registrations_prev',
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('status', r.status))
        FROM event_registrations r
        WHERE r.entity_id = p_entity_id
          AND r.created_at >= p_prev_from AND r.created_at <= p_prev_to),
        '[]'::jsonb
      )
  );
$$;

CREATE OR REPLACE FUNCTION get_analyse_news_data(
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
    'views_cur',
      count_analytics_events(
        p_entity_id, ARRAY['publication_view']::analytics_event_type[], p_from, p_to, NULL, NULL
      ),
    'views_prev',
      count_analytics_events(
        p_entity_id, ARRAY['publication_view']::analytics_event_type[], p_prev_from, p_prev_to, NULL, NULL
      ),
    'shares_cur',
      count_analytics_events(
        p_entity_id, ARRAY['publication_share']::analytics_event_type[], p_from, p_to, NULL, NULL
      ),
    'shares_prev',
      count_analytics_events(
        p_entity_id, ARRAY['publication_share']::analytics_event_type[], p_prev_from, p_prev_to, NULL, NULL
      ),
    'comments_cur',
      (SELECT count(*)::bigint
      FROM publication_comments pc
      INNER JOIN publications pub ON pub.id = pc.publication_id
      WHERE pub.entity_id = p_entity_id
        AND pc.created_at >= p_from AND pc.created_at <= p_to),
    'comments_prev',
      (SELECT count(*)::bigint
      FROM publication_comments pc
      INNER JOIN publications pub ON pub.id = pc.publication_id
      WHERE pub.entity_id = p_entity_id
        AND pc.created_at >= p_prev_from AND pc.created_at <= p_prev_to),
    'resource_counts',
      COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object('resource_id', g.resource_id, 'count', g.event_count)
          ORDER BY g.event_count DESC
        )
        FROM group_analytics_by_resource(
          p_entity_id, ARRAY['publication_view']::analytics_event_type[], p_from, p_to
        ) g),
        '[]'::jsonb
      ),
    'publications',
      COALESCE(
        (SELECT jsonb_object_agg(pub.id::text, pub.title)
        FROM publications pub
        WHERE pub.entity_id = p_entity_id),
        '{}'::jsonb
      ),
    'views_buckets',
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('bucket_index', b.bucket_index, 'value', b.event_count))
        FROM bucket_analytics_events(
          p_entity_id, ARRAY['publication_view']::analytics_event_type[], p_from, p_to, p_period, NULL, NULL
        ) b),
        '[]'::jsonb
      ),
    'shares_buckets',
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('bucket_index', b.bucket_index, 'value', b.event_count))
        FROM bucket_analytics_events(
          p_entity_id, ARRAY['publication_share']::analytics_event_type[], p_from, p_to, p_period, NULL, NULL
        ) b),
        '[]'::jsonb
      )
  );
$$;

CREATE OR REPLACE FUNCTION get_analyse_scope_data(
  p_entity_id uuid,
  p_scope text,
  p_from timestamptz,
  p_to timestamptz,
  p_prev_from timestamptz,
  p_prev_to timestamptz,
  p_period text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  CASE p_scope
    WHEN 'service' THEN
      RETURN get_analyse_service_data(
        p_entity_id, p_from, p_to, p_prev_from, p_prev_to, p_period
      );
    WHEN 'shop' THEN
      RETURN get_analyse_shop_data(
        p_entity_id, p_from, p_to, p_prev_from, p_prev_to, p_period
      );
    WHEN 'event' THEN
      RETURN get_analyse_event_data(
        p_entity_id, p_from, p_to, p_prev_from, p_prev_to, p_period
      );
    WHEN 'news' THEN
      RETURN get_analyse_news_data(
        p_entity_id, p_from, p_to, p_prev_from, p_prev_to, p_period
      );
    ELSE
      RETURN get_analyse_web_data(
        p_entity_id, p_from, p_to, p_prev_from, p_prev_to, p_period
      );
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION get_analyse_ranking_chart_buckets(
  p_entity_id uuid,
  p_scope text,
  p_from timestamptz,
  p_to timestamptz,
  p_period text,
  p_section_type menu_section_type DEFAULT NULL,
  p_resource_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_event_types analytics_event_type[];
BEGIN
  CASE p_scope
    WHEN 'web' THEN
      v_event_types := ARRAY['section_view']::analytics_event_type[];
    WHEN 'shop' THEN
      v_event_types := ARRAY['product_view']::analytics_event_type[];
    WHEN 'news' THEN
      v_event_types := ARRAY['publication_view']::analytics_event_type[];
    ELSE
      RETURN '[]'::jsonb;
  END CASE;

  RETURN COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('bucket_index', b.bucket_index, 'value', b.event_count))
    FROM bucket_analytics_events(
      p_entity_id,
      v_event_types,
      p_from,
      p_to,
      p_period,
      p_section_type,
      p_resource_id
    ) b),
    '[]'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_analyse_web_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_analyse_service_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_analyse_shop_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_analyse_event_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_analyse_news_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_analyse_scope_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_analyse_ranking_chart_buckets TO authenticated;
