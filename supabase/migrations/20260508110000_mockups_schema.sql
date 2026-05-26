-- Enum para formatos de mockup
CREATE TYPE public.mockup_format AS ENUM ('feed_square', 'feed_portrait', 'reels', 'stories', 'blog_cover');

-- Tabela de especificações dos formatos de mockup
CREATE TABLE public.mockup_format_specs (
    format public.mockup_format PRIMARY KEY,
    display_name text NOT NULL,
    width integer NOT NULL,
    height integer NOT NULL,
    aspect_label text NOT NULL,
    safe_area_top integer DEFAULT 0,
    safe_area_bottom integer DEFAULT 0,
    description text
);

-- Inserir formatos padrão
INSERT INTO public.mockup_format_specs (format, display_name, width, height, aspect_label, safe_area_top, safe_area_bottom, description) VALUES
('feed_square', 'Feed Quadrado', 1080, 1080, '1:1', 0, 0, 'Post padrão quadrado no feed.'),
('feed_portrait', 'Feed Retrato', 1080, 1350, '4:5', 0, 0, 'Post vertical no feed, ocupa mais espaço na tela.'),
('reels', 'Reels', 1080, 1920, '9:16', 0, 0, 'Formato em tela cheia para vídeo, sem áreas seguras tão rígidas quanto stories.'),
('stories', 'Stories', 1080, 1920, '9:16', 250, 250, 'Formato de stories. Possui safe areas no topo (header do app) e base (interações).'),
('blog_cover', 'Capa de Blog/Link', 1200, 630, '1.91:1', 0, 0, 'Formato otimizado para Open Graph / Twitter Cards.');

-- Tabela Fontes de Publicação
CREATE TABLE public.publication_sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text,
    brand_color_primary text,
    brand_color_secondary text,
    default_font_family text,
    logo_asset_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
    active boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_publication_sources_active ON public.publication_sources(active);

CREATE TRIGGER handle_updated_at_publication_sources
    BEFORE UPDATE ON public.publication_sources
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Tabela Fontes Disponíveis
CREATE TABLE public.available_fonts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family text NOT NULL UNIQUE,
    provider text DEFAULT 'google',
    weights_available integer[] DEFAULT '{400,700}',
    css_url text,
    preview_text text DEFAULT 'The quick brown fox',
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

INSERT INTO public.available_fonts (family, provider, weights_available, css_url) VALUES
('Inter', 'google', '{400,500,600,700,800,900}', 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'),
('Roboto', 'google', '{400,500,700,900}', 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap'),
('Montserrat', 'google', '{400,500,600,700,800,900}', 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap'),
('Poppins', 'google', '{400,500,600,700,800,900}', 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap'),
('Bebas Neue', 'google', '{400}', 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap'),
('Oswald', 'google', '{400,500,600,700}', 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap'),
('Playfair Display', 'google', '{400,500,600,700,800,900}', 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&display=swap'),
('Lato', 'google', '{400,700,900}', 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap'),
('Open Sans', 'google', '{400,500,600,700,800}', 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700;800&display=swap'),
('Anton', 'google', '{400}', 'https://fonts.googleapis.com/css2?family=Anton&display=swap');

-- Tabela Mockups
CREATE TABLE public.mockups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    publication_source_id uuid NOT NULL REFERENCES public.publication_sources(id) ON DELETE CASCADE,
    format public.mockup_format NOT NULL,
    name text NOT NULL,
    description text,
    category_tag text,
    is_default boolean DEFAULT false,
    active boolean DEFAULT true,
    asset_id uuid NOT NULL REFERENCES public.media_assets(id) ON DELETE RESTRICT,
    width integer NOT NULL,
    height integer NOT NULL,
    text_regions jsonb NOT NULL DEFAULT '[]'::jsonb,
    background_layer jsonb DEFAULT '{}'::jsonb,
    image_slot jsonb DEFAULT '{}'::jsonb,
    preview_asset_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
    usage_count integer DEFAULT 0,
    last_used_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Constraint para apenas 1 default por (source, format)
CREATE UNIQUE INDEX uniq_default_per_source_format ON public.mockups(publication_source_id, format) WHERE is_default = true;

CREATE INDEX idx_mockups_source_format_active ON public.mockups(publication_source_id, format, active);
CREATE INDEX idx_mockups_category_tag ON public.mockups(category_tag) WHERE category_tag IS NOT NULL;

CREATE TRIGGER handle_updated_at_mockups
    BEFORE UPDATE ON public.mockups
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Trigger para garantir que apenas um mockup é default por source_id e format (desmarca os outros)
CREATE OR REPLACE FUNCTION public.mockups_ensure_single_default()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE public.mockups 
        SET is_default = false 
        WHERE publication_source_id = NEW.publication_source_id 
          AND format = NEW.format 
          AND id != NEW.id 
          AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mockups_single_default
    BEFORE INSERT OR UPDATE OF is_default ON public.mockups
    FOR EACH ROW
    EXECUTE FUNCTION public.mockups_ensure_single_default();

-- Funções para reference count de media_assets em publication_sources e mockups
-- Publication Sources (logo_asset_id)
CREATE OR REPLACE FUNCTION public.sync_logo_asset_ref_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD.logo_asset_id IS DISTINCT FROM NEW.logo_asset_id THEN
            IF OLD.logo_asset_id IS NOT NULL THEN
                UPDATE public.media_assets SET reference_count = reference_count - 1 WHERE id = OLD.logo_asset_id;
            END IF;
            IF NEW.logo_asset_id IS NOT NULL THEN
                UPDATE public.media_assets SET reference_count = reference_count + 1 WHERE id = NEW.logo_asset_id;
            END IF;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        IF NEW.logo_asset_id IS NOT NULL THEN
            UPDATE public.media_assets SET reference_count = reference_count + 1 WHERE id = NEW.logo_asset_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.logo_asset_id IS NOT NULL THEN
            UPDATE public.media_assets SET reference_count = reference_count - 1 WHERE id = OLD.logo_asset_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_pub_sources_logo_update BEFORE UPDATE OF logo_asset_id ON public.publication_sources FOR EACH ROW EXECUTE FUNCTION public.sync_logo_asset_ref_count();
CREATE TRIGGER trg_pub_sources_logo_insert AFTER INSERT ON public.publication_sources FOR EACH ROW EXECUTE FUNCTION public.sync_logo_asset_ref_count();
CREATE TRIGGER trg_pub_sources_logo_delete AFTER DELETE ON public.publication_sources FOR EACH ROW EXECUTE FUNCTION public.sync_logo_asset_ref_count();

-- Mockups (asset_id e preview_asset_id)
CREATE OR REPLACE FUNCTION public.sync_mockup_asset_ref_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Asset principal
        IF OLD.asset_id IS DISTINCT FROM NEW.asset_id THEN
            IF OLD.asset_id IS NOT NULL THEN
                UPDATE public.media_assets SET reference_count = reference_count - 1 WHERE id = OLD.asset_id;
            END IF;
            IF NEW.asset_id IS NOT NULL THEN
                UPDATE public.media_assets SET reference_count = reference_count + 1 WHERE id = NEW.asset_id;
            END IF;
        END IF;
        -- Preview asset
        IF OLD.preview_asset_id IS DISTINCT FROM NEW.preview_asset_id THEN
            IF OLD.preview_asset_id IS NOT NULL THEN
                UPDATE public.media_assets SET reference_count = reference_count - 1 WHERE id = OLD.preview_asset_id;
            END IF;
            IF NEW.preview_asset_id IS NOT NULL THEN
                UPDATE public.media_assets SET reference_count = reference_count + 1 WHERE id = NEW.preview_asset_id;
            END IF;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        IF NEW.asset_id IS NOT NULL THEN
            UPDATE public.media_assets SET reference_count = reference_count + 1 WHERE id = NEW.asset_id;
        END IF;
        IF NEW.preview_asset_id IS NOT NULL THEN
            UPDATE public.media_assets SET reference_count = reference_count + 1 WHERE id = NEW.preview_asset_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.asset_id IS NOT NULL THEN
            UPDATE public.media_assets SET reference_count = reference_count - 1 WHERE id = OLD.asset_id;
        END IF;
        IF OLD.preview_asset_id IS NOT NULL THEN
            UPDATE public.media_assets SET reference_count = reference_count - 1 WHERE id = OLD.preview_asset_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_mockups_assets_update BEFORE UPDATE OF asset_id, preview_asset_id ON public.mockups FOR EACH ROW EXECUTE FUNCTION public.sync_mockup_asset_ref_count();
CREATE TRIGGER trg_mockups_assets_insert AFTER INSERT ON public.mockups FOR EACH ROW EXECUTE FUNCTION public.sync_mockup_asset_ref_count();
CREATE TRIGGER trg_mockups_assets_delete AFTER DELETE ON public.mockups FOR EACH ROW EXECUTE FUNCTION public.sync_mockup_asset_ref_count();

-- RLS Policies
ALTER TABLE public.mockup_format_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.available_fonts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mockups ENABLE ROW LEVEL SECURITY;

-- format specs
CREATE POLICY "mockup_format_specs_select_authenticated" ON public.mockup_format_specs FOR SELECT TO authenticated USING (true);
CREATE POLICY "mockup_format_specs_full_service_role" ON public.mockup_format_specs FOR ALL TO service_role USING (true);

-- publication sources
CREATE POLICY "publication_sources_full_authenticated" ON public.publication_sources FOR ALL TO authenticated USING (true);
CREATE POLICY "publication_sources_full_service_role" ON public.publication_sources FOR ALL TO service_role USING (true);

-- available fonts
CREATE POLICY "available_fonts_full_authenticated" ON public.available_fonts FOR ALL TO authenticated USING (true);
CREATE POLICY "available_fonts_full_service_role" ON public.available_fonts FOR ALL TO service_role USING (true);

-- mockups
CREATE POLICY "mockups_full_authenticated" ON public.mockups FOR ALL TO authenticated USING (true);
CREATE POLICY "mockups_full_service_role" ON public.mockups FOR ALL TO service_role USING (true);
