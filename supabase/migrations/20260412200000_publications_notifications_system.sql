-- ============================================================
-- Migration: publications_notifications_system
-- Tables: publications, publication_media, notifications
-- Includes: enums, RLS, triggers, indexes, pg_cron
-- ============================================================

-- =====================
-- 1. Enums
-- =====================

CREATE TYPE publication_status AS ENUM ('published', 'scheduled');
CREATE TYPE publication_media_type AS ENUM ('image');
CREATE TYPE notification_type AS ENUM ('new_follower', 'new_publication');

-- =====================
-- 2. Table publications
-- =====================

CREATE TABLE publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 120),
  content text CHECK (content IS NULL OR char_length(content) <= 10000),
  status publication_status NOT NULL,
  published_at timestamptz,
  scheduled_for timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Logical constraints between status and timestamps
  CONSTRAINT publications_published_check
    CHECK (status != 'published' OR (published_at IS NOT NULL AND scheduled_for IS NULL)),
  CONSTRAINT publications_scheduled_check
    CHECK (status != 'scheduled' OR (scheduled_for IS NOT NULL AND published_at IS NULL))
);

-- NOTE: "A publication must have content OR at least one media" is validated
-- at the application layer (Server Action) before insert, because it depends
-- on the publication_media table (cross-table CHECK not possible in SQL).

COMMENT ON TABLE publications IS 'News publications by entities. Content-or-media validation is enforced at application layer.';

-- Indexes
CREATE INDEX idx_publications_entity_id ON publications (entity_id);
CREATE INDEX idx_publications_published_at ON publications (entity_id, published_at DESC);
CREATE INDEX idx_publications_scheduled ON publications (scheduled_for) WHERE status = 'scheduled';

-- =====================
-- 3. Table publication_media
-- =====================

CREATE TABLE publication_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  type publication_media_type NOT NULL,
  url text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  alt_text text,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT publication_media_unique_position UNIQUE (publication_id, position)
);

CREATE INDEX idx_publication_media_publication_id ON publication_media (publication_id);

-- =====================
-- 4. Table notifications
-- =====================

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  actor_entity_id uuid REFERENCES entity(id) ON DELETE CASCADE,
  target_publication_id uuid REFERENCES publications(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient_unread ON notifications (recipient_user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_recipient ON notifications (recipient_user_id, created_at DESC);

-- =====================
-- 5. RLS — publications
-- =====================

ALTER TABLE publications ENABLE ROW LEVEL SECURITY;

-- Public: only published publications whose published_at has passed
CREATE POLICY "publications_select_public"
  ON publications FOR SELECT
  USING (
    status = 'published'
    AND published_at IS NOT NULL
    AND published_at <= now()
  );

-- Owner: can see all their own publications (including scheduled)
CREATE POLICY "publications_owner_select_all"
  ON publications FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

CREATE POLICY "publications_owner_insert"
  ON publications FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

CREATE POLICY "publications_owner_update"
  ON publications FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

CREATE POLICY "publications_owner_delete"
  ON publications FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM entity WHERE id = entity_id AND user_id = auth.uid())
  );

-- =====================
-- 6. RLS — publication_media
-- =====================

ALTER TABLE publication_media ENABLE ROW LEVEL SECURITY;

-- Public: media of publicly visible publications
CREATE POLICY "publication_media_select_public"
  ON publication_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM publications
      WHERE id = publication_id
        AND status = 'published'
        AND published_at IS NOT NULL
        AND published_at <= now()
    )
  );

-- Owner: full access on media of own publications
CREATE POLICY "publication_media_owner_select"
  ON publication_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM publications
      JOIN entity ON entity.id = publications.entity_id
      WHERE publications.id = publication_id
        AND entity.user_id = auth.uid()
    )
  );

CREATE POLICY "publication_media_owner_insert"
  ON publication_media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM publications
      JOIN entity ON entity.id = publications.entity_id
      WHERE publications.id = publication_id
        AND entity.user_id = auth.uid()
    )
  );

CREATE POLICY "publication_media_owner_update"
  ON publication_media FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM publications
      JOIN entity ON entity.id = publications.entity_id
      WHERE publications.id = publication_id
        AND entity.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM publications
      JOIN entity ON entity.id = publications.entity_id
      WHERE publications.id = publication_id
        AND entity.user_id = auth.uid()
    )
  );

CREATE POLICY "publication_media_owner_delete"
  ON publication_media FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM publications
      JOIN entity ON entity.id = publications.entity_id
      WHERE publications.id = publication_id
        AND entity.user_id = auth.uid()
    )
  );

-- =====================
-- 7. RLS — notifications
-- =====================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "notifications_own_select"
  ON notifications FOR SELECT
  USING (recipient_user_id = auth.uid());

-- Users can only update their own notifications (mark as read)
CREATE POLICY "notifications_own_update"
  ON notifications FOR UPDATE
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

-- No INSERT policy: triggers insert in SECURITY DEFINER context
-- No DELETE policy at MVP: history is kept

-- =====================
-- 8. Trigger updated_at on publications
-- =====================

CREATE TRIGGER trg_publications_updated_at
  BEFORE UPDATE ON publications
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- =====================
-- 9. Trigger new_follower notification
-- =====================

CREATE OR REPLACE FUNCTION create_follower_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_user_id uuid;
  v_actor_entity_id uuid;
BEGIN
  -- Get the owner of the followed entity
  SELECT user_id INTO v_owner_user_id
  FROM entity
  WHERE id = NEW.followed_entity_id;

  -- Skip if entity is orphaned (e.g. __agora__ system profile)
  IF v_owner_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the entity of the follower (actor)
  SELECT id INTO v_actor_entity_id
  FROM entity
  WHERE user_id = NEW.follower_user_id;

  INSERT INTO notifications (recipient_user_id, type, actor_entity_id)
  VALUES (v_owner_user_id, 'new_follower', v_actor_entity_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_follow_notify
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION create_follower_notification();

-- =====================
-- 10. Trigger new_publication notifications
-- =====================

CREATE OR REPLACE FUNCTION create_publication_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify if the publication is effectively published now
  IF NEW.published_at IS NULL OR NEW.published_at > now() THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (recipient_user_id, type, actor_entity_id, target_publication_id)
  SELECT
    f.follower_user_id,
    'new_publication',
    NEW.entity_id,
    NEW.id
  FROM follows f
  WHERE f.followed_entity_id = NEW.entity_id;

  RETURN NEW;
END;
$$;

-- Trigger on INSERT when directly published
CREATE TRIGGER on_publication_insert_notify
  AFTER INSERT ON publications
  FOR EACH ROW
  WHEN (NEW.status = 'published')
  EXECUTE FUNCTION create_publication_notifications();

-- Trigger on UPDATE when status changes from scheduled to published
CREATE TRIGGER on_publication_publish_notify
  AFTER UPDATE OF status ON publications
  FOR EACH ROW
  WHEN (OLD.status = 'scheduled' AND NEW.status = 'published')
  EXECUTE FUNCTION create_publication_notifications();

-- =====================
-- 11. pg_cron — auto-publish scheduled publications
-- =====================

-- pg_cron is a Supabase-native extension. If available, enable it and
-- create a job that runs every minute to publish scheduled publications.
-- If pg_cron is not enabled on this project, this section can be skipped
-- and scheduled publications will appear via the RLS time-based filter,
-- but notifications won't fire until a manual status update.

-- Uncomment after enabling pg_cron in Supabase dashboard:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule(
--   'publish-scheduled',
--   '* * * * *',
--   $$
--     UPDATE publications
--     SET status = 'published', published_at = scheduled_for, scheduled_for = NULL
--     WHERE status = 'scheduled' AND scheduled_for <= now();
--   $$
-- );
