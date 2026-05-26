-- Função utilitária para gerar o caminho de armazenamento do bucket para mockups
CREATE OR REPLACE FUNCTION public.build_mockup_path(source_slug text, format public.mockup_format, mockup_id uuid)
RETURNS text AS $$
BEGIN
    RETURN 'Mockups/' || source_slug || '/' || format::text || '/' || mockup_id::text || '.png';
END;
$$ LANGUAGE plpgsql IMMUTABLE;
