-- ============================================================
-- Migration: follows_system
-- Adds follows table + denormalized counters on entity
-- ============================================================

-- 1. Add counter columns to entity
ALTER TABLE entity
  ADD COLUMN followers_count integer NOT NULL DEFAULT 0,
  ADD COLUMN following_count integer NOT NULL DEFAULT 0;

-- 2. Create follows table
CREATE TABLE follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followed_entity_id uuid NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT follows_unique UNIQUE (follower_user_id, followed_entity_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_follows_followed_entity ON follows (followed_entity_id);
CREATE INDEX idx_follows_follower_user ON follows (follower_user_id);

-- 3. RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Anyone can read follows (counters are public)
CREATE POLICY "follows_select_public"
  ON follows FOR SELECT
  USING (true);

-- Only the authenticated user can insert their own follow
CREATE POLICY "follows_insert_owner"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_user_id);

-- Only the authenticated user can delete their own follow
CREATE POLICY "follows_delete_owner"
  ON follows FOR DELETE
  USING (auth.uid() = follower_user_id);

-- No UPDATE policy: a follow is inserted or deleted, never modified

-- 4. Trigger functions for denormalized counters (SECURITY DEFINER)

CREATE OR REPLACE FUNCTION increment_followers_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE entity
    SET followers_count = followers_count + 1
    WHERE id = NEW.followed_entity_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_followers_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE entity
    SET followers_count = followers_count - 1
    WHERE id = OLD.followed_entity_id;
  RETURN OLD;
END;
$$;

-- 5. Attach triggers
CREATE TRIGGER on_follow_insert
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION increment_followers_count();

CREATE TRIGGER on_follow_delete
  AFTER DELETE ON follows
  FOR EACH ROW
  EXECUTE FUNCTION decrement_followers_count();
