-- ============================================================
-- Sync edition status to 'postado' when all its scheduled posts are posted
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_edition_all_posts_posted()
RETURNS TRIGGER AS $$
DECLARE
  v_edition_id uuid;
  v_all_posted boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    BEGIN
      v_edition_id := OLD.edition_id::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_edition_id := NULL;
    END;
  ELSE
    BEGIN
      v_edition_id := NEW.edition_id::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_edition_id := NULL;
    END;
  END IF;

  IF v_edition_id IS NOT NULL THEN
    -- Check if there is at least one post and all are 'postado'
    SELECT EXISTS (
      SELECT 1 FROM public.scheduled_posts WHERE edition_id = v_edition_id::text
    ) AND NOT EXISTS (
      SELECT 1 FROM public.scheduled_posts 
      WHERE edition_id = v_edition_id::text AND status != 'postado'
    ) INTO v_all_posted;

    IF v_all_posted THEN
      UPDATE public.editions
      SET status = 'postado'
      WHERE id = v_edition_id AND status != 'postado';
    ELSE
      UPDATE public.editions
      SET status = CASE 
        WHEN EXISTS (SELECT 1 FROM public.scheduled_posts WHERE edition_id = v_edition_id::text AND status = 'agendado') THEN 'scheduled'
        ELSE 'pending'
      END
      WHERE id = v_edition_id AND status = 'postado';
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_check_edition_posted
  AFTER INSERT OR UPDATE OF status OR DELETE
  ON public.scheduled_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_edition_all_posts_posted();
