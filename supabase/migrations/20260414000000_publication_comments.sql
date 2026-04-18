-- ============================================================
-- Migration: publication_comments
-- Adds comments on publications with rate limiting,
-- denormalized counter, notifications, and full RLS.
-- ============================================================

-- =====================
-- 1. Extend notification_type enum
-- =====================

ALTER TYPE notification_type ADD VALUE 'new_comment';

-- =====================
-- 2. Add comments_count to publications
-- =====================

ALTER TABLE publications
  ADD COLUMN comments_count integer NOT NULL DEFAULT 0;

-- =====================
-- 3. Table publication_comments
-- =====================

CREATE TABLE publication_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE publication_comments IS 'Comments on publications. Auth-only, rate-limited to 1/min/user via RLS.';

-- Indexes
CREATE INDEX idx_publication_comments_publication_id ON publication_comments (publication_id, created_at ASC);
CREATE INDEX idx_publication_comments_user_id ON publication_comments (user_id);

-- =====================
-- 4. Rate limiting function
-- =====================

CREATE OR REPLACE FUNCTION check_comment_rate_limit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM publication_comments
    WHERE user_id = p_user_id
      AND created_at > now() - interval '1 minute'
  );
END;
$$;

-- =====================
-- 5. RLS
-- =====================

ALTER TABLE publication_comments ENABLE ROW LEVEL SECURITY;

-- Public: comments on published publications only
CREATE POLICY "comments_select_public"
  ON publication_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM publications
      WHERE id = publication_id
        AND status = 'published'
        AND published_at IS NOT NULL
        AND published_at <= now()
    )
  );

-- Authenticated users can insert their own comments (rate-limited)
CREATE POLICY "comments_insert_authenticated"
  ON publication_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND check_comment_rate_limit(auth.uid())
  );

-- Author can update their own comments
CREATE POLICY "comments_update_own"
  ON publication_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Author can delete their own comments
CREATE POLICY "comments_delete_own"
  ON publication_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Publication owner can delete any comment (moderation)
CREATE POLICY "comments_delete_publication_owner"
  ON publication_comments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM publications
      JOIN entity ON entity.id = publications.entity_id
      WHERE publications.id = publication_id
        AND entity.user_id = auth.uid()
    )
  );

-- =====================
-- 6. Trigger updated_at
-- =====================

CREATE TRIGGER trg_publication_comments_updated_at
  BEFORE UPDATE ON publication_comments
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- =====================
-- 7. Denormalized comments_count triggers
-- =====================

CREATE OR REPLACE FUNCTION increment_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE publications
    SET comments_count = comments_count + 1
    WHERE id = NEW.publication_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE publications
    SET comments_count = comments_count - 1
    WHERE id = OLD.publication_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_comment_insert_count
  AFTER INSERT ON publication_comments
  FOR EACH ROW
  EXECUTE FUNCTION increment_comments_count();

CREATE TRIGGER on_comment_delete_count
  AFTER DELETE ON publication_comments
  FOR EACH ROW
  EXECUTE FUNCTION decrement_comments_count();

-- =====================
-- 8. Notification trigger — notify publication owner on new comment
-- =====================

CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_publication_entity_id uuid;
  v_owner_user_id uuid;
  v_commenter_entity_id uuid;
BEGIN
  -- Get the entity that owns the publication
  SELECT p.entity_id INTO v_publication_entity_id
  FROM publications p
  WHERE p.id = NEW.publication_id;

  -- Get the user_id of the publication owner
  SELECT e.user_id INTO v_owner_user_id
  FROM entity e
  WHERE e.id = v_publication_entity_id;

  -- Skip if owner is NULL (orphaned entity) or if commenter is the owner
  IF v_owner_user_id IS NULL OR v_owner_user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get the entity of the commenter (actor)
  SELECT e.id INTO v_commenter_entity_id
  FROM entity e
  WHERE e.user_id = NEW.user_id;

  INSERT INTO notifications (recipient_user_id, type, actor_entity_id, target_publication_id)
  VALUES (v_owner_user_id, 'new_comment', v_commenter_entity_id, NEW.publication_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_comment_insert_notify
  AFTER INSERT ON publication_comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_notification();

-- =====================
-- 9. View for comments with author entity data
-- =====================
-- publication_comments.user_id references auth.users, not entity.
-- PostgREST cannot resolve the indirect join (comments → auth.users ← entity).
-- This view provides a clean query surface without denormalizing entity_id.

CREATE OR REPLACE VIEW publication_comments_with_author AS
SELECT
  c.id,
  c.publication_id,
  c.user_id,
  c.content,
  c.created_at,
  c.updated_at,
  e.id AS author_entity_id,
  e.display_name AS author_display_name,
  e.avatar_url AS author_avatar_url,
  e.slug AS author_slug
FROM publication_comments c
JOIN entity e ON e.user_id = c.user_id;
