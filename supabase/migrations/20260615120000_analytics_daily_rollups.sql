-- =============================================================================
-- Analytics daily rollups — Niveau 3
-- Agrège entity_analytics_events par jour ; lecture hybride rollup + events bruts.
-- Pas de backfill automatique : le cron avance jour par jour depuis last_completed_day.
-- =============================================================================

CREATE TABLE entity_analytics_daily (
  entity_id      uuid                  NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  day            date                  NOT NULL,
  event_type     analytics_event_type  NOT NULL,
  dimension_key  text                  NOT NULL DEFAULT '_total',
  event_count    bigint                NOT NULL DEFAULT 0,
  distinct_count bigint                NOT NULL DEFAULT 0,
  updated_at     timestamptz           NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_id, day, event_type, dimension_key),
  CONSTRAINT entity_analytics_daily_dimension_key_chk CHECK (
    dimension_key = '_total'
    OR dimension_key LIKE 'section:%'
    OR dimension_key LIKE 'resource:%'
  )
);

COMMENT ON TABLE entity_analytics_daily IS
  'Rollups journaliers des événements analytics. dimension_key: _total | section:<type> | resource:<uuid>.';

CREATE INDEX idx_entity_analytics_daily_entity_day
  ON entity_analytics_daily (entity_id, day DESC);

CREATE INDEX idx_entity_analytics_daily_entity_type_day
  ON entity_analytics_daily (entity_id, event_type, day DESC);

CREATE TABLE entity_analytics_rollup_state (
  id                 int  PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_completed_day date NOT NULL DEFAULT '1970-01-01'::date,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

INSERT INTO entity_analytics_rollup_state (id, last_completed_day)
VALUES (1, '1970-01-01'::date)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE entity_analytics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY entity_analytics_daily_owner_select
  ON entity_analytics_daily
  FOR SELECT
  USING (
    entity_id IN (SELECT id FROM entity WHERE user_id = auth.uid())
  );

ALTER TABLE entity_analytics_rollup_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY entity_analytics_rollup_state_owner_select
  ON entity_analytics_rollup_state
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- =============================================================================
-- Rollup interne (SECURITY DEFINER — écrit sans policy INSERT utilisateur)
-- =============================================================================

CREATE OR REPLACE FUNCTION rollup_entity_analytics_daily(p_day date)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows bigint := 0;
  v_day_start timestamptz := p_day::timestamptz;
  v_day_end timestamptz := (p_day + 1)::timestamptz;
BEGIN
  DELETE FROM entity_analytics_daily
  WHERE day = p_day;

  INSERT INTO entity_analytics_daily (
    entity_id, day, event_type, dimension_key, event_count, distinct_count
  )
  SELECT
    e.entity_id,
    p_day,
    e.event_type,
    '_total',
    count(*)::bigint,
    count(DISTINCT coalesce(e.visitor_key, e.id::text))::bigint
  FROM entity_analytics_events e
  WHERE e.occurred_at >= v_day_start
    AND e.occurred_at < v_day_end
  GROUP BY e.entity_id, e.event_type;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  INSERT INTO entity_analytics_daily (
    entity_id, day, event_type, dimension_key, event_count, distinct_count
  )
  SELECT
    e.entity_id,
    p_day,
    e.event_type,
    'section:' || e.section_type::text,
    count(*)::bigint,
    count(DISTINCT coalesce(e.visitor_key, e.id::text))::bigint
  FROM entity_analytics_events e
  WHERE e.occurred_at >= v_day_start
    AND e.occurred_at < v_day_end
    AND e.section_type IS NOT NULL
  GROUP BY e.entity_id, e.event_type, e.section_type;

  INSERT INTO entity_analytics_daily (
    entity_id, day, event_type, dimension_key, event_count, distinct_count
  )
  SELECT
    e.entity_id,
    p_day,
    e.event_type,
    'resource:' || e.resource_id::text,
    count(*)::bigint,
    count(DISTINCT coalesce(e.visitor_key, e.id::text))::bigint
  FROM entity_analytics_events e
  WHERE e.occurred_at >= v_day_start
    AND e.occurred_at < v_day_end
    AND e.resource_id IS NOT NULL
  GROUP BY e.entity_id, e.event_type, e.resource_id;

  RETURN v_rows;
END;
$$;

CREATE OR REPLACE FUNCTION rollup_entity_analytics_incremental()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day date;
  v_yesterday date := (timezone('utc', now()))::date - 1;
  v_last date;
  v_rows bigint := 0;
  v_total bigint := 0;
BEGIN
  SELECT last_completed_day INTO v_last
  FROM entity_analytics_rollup_state
  WHERE id = 1;

  v_day := v_last + 1;

  WHILE v_day <= v_yesterday LOOP
    v_rows := rollup_entity_analytics_daily(v_day);
    v_total := v_total + v_rows;
    v_day := v_day + 1;
  END LOOP;

  IF v_yesterday > v_last THEN
    UPDATE entity_analytics_rollup_state
    SET last_completed_day = v_yesterday,
        updated_at = now()
    WHERE id = 1;
  ELSE
    UPDATE entity_analytics_rollup_state
    SET updated_at = now()
    WHERE id = 1;
  END IF;

  RETURN jsonb_build_object(
    'last_completed_day', (SELECT last_completed_day FROM entity_analytics_rollup_state WHERE id = 1),
    'rows_upserted', v_total
  );
END;
$$;

CREATE OR REPLACE FUNCTION backfill_entity_analytics_daily(
  p_from_day date,
  p_to_day date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day date;
  v_total bigint := 0;
  v_rows bigint;
BEGIN
  IF p_from_day > p_to_day THEN
    RAISE EXCEPTION 'p_from_day must be <= p_to_day';
  END IF;

  v_day := p_from_day;
  WHILE v_day <= p_to_day LOOP
    v_rows := rollup_entity_analytics_daily(v_day);
    v_total := v_total + v_rows;
    v_day := v_day + 1;
  END LOOP;

  UPDATE entity_analytics_rollup_state
  SET last_completed_day = GREATEST(last_completed_day, p_to_day),
      updated_at = now()
  WHERE id = 1;

  RETURN jsonb_build_object(
    'from_day', p_from_day,
    'to_day', p_to_day,
    'rows_upserted', v_total,
    'last_completed_day', (SELECT last_completed_day FROM entity_analytics_rollup_state WHERE id = 1)
  );
END;
$$;

-- =============================================================================
-- Helpers lecture hybride (rollup jours complets + events bruts pour le reste)
-- =============================================================================

CREATE OR REPLACE FUNCTION analytics_rollup_cutoff()
RETURNS date
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT last_completed_day
  FROM entity_analytics_rollup_state
  WHERE id = 1;
$$;

CREATE OR REPLACE FUNCTION count_analytics_events_hybrid(
  p_entity_id uuid,
  p_event_types analytics_event_type[],
  p_from timestamptz,
  p_to timestamptz,
  p_section_type menu_section_type DEFAULT NULL,
  p_resource_id uuid DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_cutoff date;
  v_rollup bigint := 0;
  v_raw bigint := 0;
  v_raw_from timestamptz;
BEGIN
  v_cutoff := analytics_rollup_cutoff();

  IF p_from::date <= v_cutoff THEN
    SELECT coalesce(sum(d.event_count), 0)::bigint INTO v_rollup
    FROM entity_analytics_daily d
    WHERE d.entity_id = p_entity_id
      AND d.event_type = ANY (p_event_types)
      AND d.dimension_key = CASE
        WHEN p_section_type IS NOT NULL THEN 'section:' || p_section_type::text
        WHEN p_resource_id IS NOT NULL THEN 'resource:' || p_resource_id::text
        ELSE '_total'
      END
      AND d.day >= p_from::date
      AND d.day <= LEAST(p_to::date, v_cutoff);
  END IF;

  IF p_to::date > v_cutoff THEN
    v_raw_from := GREATEST(p_from, (v_cutoff + 1)::timestamptz);
    v_raw := count_analytics_events(
      p_entity_id,
      p_event_types,
      v_raw_from,
      p_to,
      p_section_type,
      p_resource_id
    );
  END IF;

  RETURN v_rollup + v_raw;
END;
$$;

CREATE OR REPLACE FUNCTION group_analytics_by_section_hybrid(
  p_entity_id uuid,
  p_event_types analytics_event_type[],
  p_from timestamptz,
  p_to timestamptz
)
RETURNS TABLE(section_type menu_section_type, event_count bigint)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_cutoff date;
  v_raw_from timestamptz;
BEGIN
  v_cutoff := analytics_rollup_cutoff();

  RETURN QUERY
  WITH rollup AS (
    SELECT
      (split_part(d.dimension_key, ':', 2))::menu_section_type AS section_type,
      sum(d.event_count)::bigint AS event_count
    FROM entity_analytics_daily d
    WHERE d.entity_id = p_entity_id
      AND d.event_type = ANY (p_event_types)
      AND d.dimension_key LIKE 'section:%'
      AND d.day >= p_from::date
      AND d.day <= LEAST(p_to::date, v_cutoff)
    GROUP BY 1
  ),
  raw AS (
    SELECT g.section_type, g.event_count
    FROM group_analytics_by_section(
      p_entity_id,
      p_event_types,
      CASE WHEN p_from::date > v_cutoff THEN p_from ELSE (v_cutoff + 1)::timestamptz END,
      p_to
    ) g
    WHERE p_to::date > v_cutoff
  ),
  merged AS (
    SELECT * FROM rollup
    UNION ALL
    SELECT * FROM raw
  )
  SELECT m.section_type, sum(m.event_count)::bigint AS event_count
  FROM merged m
  WHERE m.section_type IS NOT NULL
  GROUP BY m.section_type;
END;
$$;

CREATE OR REPLACE FUNCTION group_analytics_by_resource_hybrid(
  p_entity_id uuid,
  p_event_types analytics_event_type[],
  p_from timestamptz,
  p_to timestamptz
)
RETURNS TABLE(resource_id uuid, event_count bigint)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_cutoff date;
BEGIN
  RETURN QUERY
  WITH rollup AS (
    SELECT
      (split_part(d.dimension_key, ':', 2))::uuid AS resource_id,
      sum(d.event_count)::bigint AS event_count
    FROM entity_analytics_daily d
    WHERE d.entity_id = p_entity_id
      AND d.event_type = ANY (p_event_types)
      AND d.dimension_key LIKE 'resource:%'
      AND d.day >= p_from::date
      AND d.day <= LEAST(p_to::date, analytics_rollup_cutoff())
    GROUP BY 1
  ),
  raw AS (
    SELECT g.resource_id, g.event_count
    FROM group_analytics_by_resource(
      p_entity_id,
      p_event_types,
      CASE
        WHEN p_from::date > analytics_rollup_cutoff() THEN p_from
        ELSE (analytics_rollup_cutoff() + 1)::timestamptz
      END,
      p_to
    ) g
    WHERE p_to::date > analytics_rollup_cutoff()
  ),
  merged AS (
    SELECT * FROM rollup
    UNION ALL
    SELECT * FROM raw
  )
  SELECT m.resource_id, sum(m.event_count)::bigint AS event_count
  FROM merged m
  WHERE m.resource_id IS NOT NULL
  GROUP BY m.resource_id;
END;
$$;

CREATE OR REPLACE FUNCTION bucket_analytics_events_hybrid(
  p_entity_id uuid,
  p_event_types analytics_event_type[],
  p_from timestamptz,
  p_to timestamptz,
  p_period text,
  p_section_type menu_section_type DEFAULT NULL,
  p_resource_id uuid DEFAULT NULL
)
RETURNS TABLE(bucket_index int, event_count bigint)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_cutoff date;
BEGIN
  v_cutoff := analytics_rollup_cutoff();

  RETURN QUERY
  WITH rollup AS (
    SELECT
      analytics_event_bucket_index(p_period, p_from, p_to, d.day::timestamptz) AS bucket_index,
      sum(d.event_count)::bigint AS event_count
    FROM entity_analytics_daily d
    WHERE d.entity_id = p_entity_id
      AND d.event_type = ANY (p_event_types)
      AND d.dimension_key = CASE
        WHEN p_section_type IS NOT NULL THEN 'section:' || p_section_type::text
        WHEN p_resource_id IS NOT NULL THEN 'resource:' || p_resource_id::text
        ELSE '_total'
      END
      AND d.day >= p_from::date
      AND d.day <= LEAST(p_to::date, v_cutoff)
    GROUP BY 1
  ),
  raw AS (
    SELECT b.bucket_index, b.event_count
    FROM bucket_analytics_events(
      p_entity_id,
      p_event_types,
      CASE WHEN p_from::date > v_cutoff THEN p_from ELSE (v_cutoff + 1)::timestamptz END,
      p_to,
      p_period,
      p_section_type,
      p_resource_id
    ) b
    WHERE p_to::date > v_cutoff
  ),
  merged AS (
    SELECT * FROM rollup
    UNION ALL
    SELECT * FROM raw
  )
  SELECT m.bucket_index, sum(m.event_count)::bigint AS event_count
  FROM merged m
  GROUP BY m.bucket_index;
END;
$$;

CREATE OR REPLACE FUNCTION bucket_analytics_distinct_visitors_hybrid(
  p_entity_id uuid,
  p_event_types analytics_event_type[],
  p_from timestamptz,
  p_to timestamptz,
  p_period text,
  p_section_type menu_section_type DEFAULT NULL,
  p_resource_id uuid DEFAULT NULL
)
RETURNS TABLE(bucket_index int, event_count bigint)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_cutoff date;
BEGIN
  v_cutoff := analytics_rollup_cutoff();

  -- Semaine : 1 bucket = 1 jour → distinct_count journalier exact depuis rollup.
  IF p_period = 'week' THEN
    RETURN QUERY
    WITH rollup AS (
      SELECT
        (d.day - p_from::date)::int AS bucket_index,
        d.distinct_count::bigint AS event_count
      FROM entity_analytics_daily d
      WHERE d.entity_id = p_entity_id
        AND d.event_type = ANY (p_event_types)
        AND d.dimension_key = '_total'
        AND d.day >= p_from::date
        AND d.day <= LEAST(p_to::date, v_cutoff)
    ),
    raw AS (
      SELECT b.bucket_index, b.event_count
      FROM bucket_analytics_distinct_visitors(
        p_entity_id,
        p_event_types,
        CASE WHEN p_from::date > v_cutoff THEN p_from ELSE (v_cutoff + 1)::timestamptz END,
        p_to,
        p_period,
        p_section_type,
        p_resource_id
      ) b
      WHERE p_to::date > v_cutoff
    ),
    merged AS (
      SELECT * FROM rollup
      UNION ALL
      SELECT * FROM raw
    )
    SELECT m.bucket_index, sum(m.event_count)::bigint AS event_count
    FROM merged m
    GROUP BY m.bucket_index;
    RETURN;
  END IF;

  -- month/year : fallback events bruts (distinct multi-jours non additif).
  RETURN QUERY
  SELECT b.bucket_index, b.event_count
  FROM bucket_analytics_distinct_visitors(
    p_entity_id,
    p_event_types,
    p_from,
    p_to,
    p_period,
    p_section_type,
    p_resource_id
  ) b;
END;
$$;

-- =============================================================================
-- RPCs Analyse — basculer les comptages event-based sur les helpers hybrides
-- (distinct KPIs multi-jours restent sur count_analytics_distinct_visitors)
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
      count_analytics_events_hybrid(
        p_entity_id, ARRAY['product_view']::analytics_event_type[], p_from, p_to, NULL, NULL
      ),
    'views_prev',
      count_analytics_events_hybrid(
        p_entity_id, ARRAY['product_view']::analytics_event_type[], p_prev_from, p_prev_to, NULL, NULL
      ),
    'wishlist_cur',
      count_analytics_events_hybrid(
        p_entity_id, ARRAY['wishlist_add']::analytics_event_type[], p_from, p_to, NULL, NULL
      ),
    'wishlist_prev',
      count_analytics_events_hybrid(
        p_entity_id, ARRAY['wishlist_add']::analytics_event_type[], p_prev_from, p_prev_to, NULL, NULL
      ),
    'resource_counts',
      COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object('resource_id', g.resource_id, 'count', g.event_count)
          ORDER BY g.event_count DESC
        )
        FROM group_analytics_by_resource_hybrid(
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
        FROM bucket_analytics_events_hybrid(
          p_entity_id, ARRAY['wishlist_add']::analytics_event_type[], p_from, p_to, p_period, NULL, NULL
        ) b),
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
      count_analytics_events_hybrid(
        p_entity_id, ARRAY['publication_view']::analytics_event_type[], p_from, p_to, NULL, NULL
      ),
    'views_prev',
      count_analytics_events_hybrid(
        p_entity_id, ARRAY['publication_view']::analytics_event_type[], p_prev_from, p_prev_to, NULL, NULL
      ),
    'shares_cur',
      count_analytics_events_hybrid(
        p_entity_id, ARRAY['publication_share']::analytics_event_type[], p_from, p_to, NULL, NULL
      ),
    'shares_prev',
      count_analytics_events_hybrid(
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
        FROM group_analytics_by_resource_hybrid(
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
        FROM bucket_analytics_events_hybrid(
          p_entity_id, ARRAY['publication_view']::analytics_event_type[], p_from, p_to, p_period, NULL, NULL
        ) b),
        '[]'::jsonb
      ),
    'shares_buckets',
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('bucket_index', b.bucket_index, 'value', b.event_count))
        FROM bucket_analytics_events_hybrid(
          p_entity_id, ARRAY['publication_share']::analytics_event_type[], p_from, p_to, p_period, NULL, NULL
        ) b),
        '[]'::jsonb
      )
  );
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
    FROM bucket_analytics_events_hybrid(
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

GRANT EXECUTE ON FUNCTION rollup_entity_analytics_incremental TO service_role;
GRANT EXECUTE ON FUNCTION backfill_entity_analytics_daily TO service_role;
GRANT EXECUTE ON FUNCTION analytics_rollup_cutoff TO authenticated;
GRANT EXECUTE ON FUNCTION count_analytics_events_hybrid TO authenticated;
GRANT EXECUTE ON FUNCTION group_analytics_by_section_hybrid TO authenticated;
GRANT EXECUTE ON FUNCTION group_analytics_by_resource_hybrid TO authenticated;
GRANT EXECUTE ON FUNCTION bucket_analytics_events_hybrid TO authenticated;
GRANT EXECUTE ON FUNCTION bucket_analytics_distinct_visitors_hybrid TO authenticated;
