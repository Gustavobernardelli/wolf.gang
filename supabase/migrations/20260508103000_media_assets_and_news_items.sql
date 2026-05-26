-- PARTE 1: Enum e Tabela media_assets

-- Função para updated_at (caso não exista)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Enum para status de download de imagens nas notícias
CREATE TYPE public.image_download_status AS ENUM ('pending', 'success', 'failed', 'skipped', 'no_image');

-- Tabela central de mídias (deduplicação)
CREATE TABLE public.media_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hash_sha256 text NOT NULL,
    bucket text NOT NULL DEFAULT 'Midia',
    storage_path text NOT NULL,
    public_url text NOT NULL,
    original_url text,
    original_mime_type text,
    original_size_bytes integer,
    processed_mime_type text DEFAULT 'image/webp',
    processed_size_bytes integer,
    width integer,
    height integer,
    was_resized boolean DEFAULT false,
    processing_metadata jsonb DEFAULT '{}'::jsonb,
    reference_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Unique constraints e índices de media_assets
CREATE UNIQUE INDEX idx_media_assets_hash ON public.media_assets(hash_sha256);
CREATE UNIQUE INDEX idx_media_assets_storage_path ON public.media_assets(storage_path);
CREATE INDEX idx_media_assets_ref_count ON public.media_assets(reference_count);

-- Trigger genérica para updated_at em media_assets
CREATE TRIGGER handle_updated_at_media_assets
    BEFORE UPDATE ON public.media_assets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- PARTE 2: Ampliar news_items

ALTER TABLE public.news_items
    ADD COLUMN image_asset_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
    ADD COLUMN image_download_status public.image_download_status NOT NULL DEFAULT 'pending',
    ADD COLUMN image_download_error text,
    ADD COLUMN image_download_attempts smallint NOT NULL DEFAULT 0,
    ADD COLUMN image_processed_at timestamptz;

-- Índice para facilitar retry (filtrando pending ou failed)
CREATE INDEX idx_news_items_image_pending_failed 
    ON public.news_items(image_download_status) 
    WHERE image_download_status IN ('pending', 'failed');

-- PARTE 3: View de facilitação
CREATE VIEW public.news_items_with_image AS
SELECT 
  n.*,
  COALESCE(m.public_url, n.image_url) AS display_image_url,
  m.width AS image_width,
  m.height AS image_height,
  (m.id IS NOT NULL) AS has_local_image
FROM public.news_items n
LEFT JOIN public.media_assets m ON n.image_asset_id = m.id;

-- Conceder permissão na view
GRANT SELECT ON public.news_items_with_image TO authenticated;

-- PARTE 4: Funções de trigger para reference_count

-- Função para atualizar reference_count no update de news_items
CREATE OR REPLACE FUNCTION public.sync_media_asset_ref_count_on_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o asset_id mudou
    IF (OLD.image_asset_id IS DISTINCT FROM NEW.image_asset_id) THEN
        -- Decrementa o antigo (se houver)
        IF OLD.image_asset_id IS NOT NULL THEN
            UPDATE public.media_assets 
            SET reference_count = reference_count - 1 
            WHERE id = OLD.image_asset_id;
        END IF;
        -- Incrementa o novo (se houver)
        IF NEW.image_asset_id IS NOT NULL THEN
            UPDATE public.media_assets 
            SET reference_count = reference_count + 1 
            WHERE id = NEW.image_asset_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar reference_count no insert de news_items
CREATE OR REPLACE FUNCTION public.sync_media_asset_ref_count_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.image_asset_id IS NOT NULL THEN
        UPDATE public.media_assets 
        SET reference_count = reference_count + 1 
        WHERE id = NEW.image_asset_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar reference_count no delete de news_items
CREATE OR REPLACE FUNCTION public.sync_media_asset_ref_count_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.image_asset_id IS NOT NULL THEN
        UPDATE public.media_assets 
        SET reference_count = reference_count - 1 
        WHERE id = OLD.image_asset_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers em news_items
CREATE TRIGGER trg_news_items_asset_update
    BEFORE UPDATE OF image_asset_id ON public.news_items
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_media_asset_ref_count_on_update();

CREATE TRIGGER trg_news_items_asset_insert
    AFTER INSERT ON public.news_items
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_media_asset_ref_count_on_insert();

CREATE TRIGGER trg_news_items_asset_delete
    AFTER DELETE ON public.news_items
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_media_asset_ref_count_on_delete();

-- PARTE 5: Função cleanup_orphan_assets
CREATE OR REPLACE FUNCTION public.cleanup_orphan_assets(days_old int DEFAULT 7)
RETURNS TABLE (asset_id uuid, storage_path text, public_url text, created_at timestamptz) AS $$
BEGIN
    RETURN QUERY
    SELECT id, m.storage_path, m.public_url, m.created_at
    FROM public.media_assets m
    WHERE reference_count <= 0 
      AND m.created_at < (now() - (days_old || ' days')::interval);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PARTE 6: RLS em media_assets
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_assets_select_authenticated"
    ON public.media_assets FOR SELECT
    TO authenticated
    USING (true);

-- Permissão total para service_role é padrão no Postgres/Supabase, 
-- mas podemos garantir via grant:
GRANT ALL ON public.media_assets TO service_role;
