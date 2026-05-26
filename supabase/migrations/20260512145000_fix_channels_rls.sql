-- ============================================================
-- Verifica e corrige as políticas RLS da tabela channels
-- Execute este SQL no Supabase Dashboard → SQL Editor
-- ============================================================

-- 1) Habilita RLS se ainda não estiver habilitado
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

-- 2) Remove políticas antigas que possam existir com nomes conflitantes
DROP POLICY IF EXISTS "channels_select_authenticated" ON public.channels;
DROP POLICY IF EXISTS "channels_insert_authenticated" ON public.channels;
DROP POLICY IF EXISTS "channels_update_authenticated" ON public.channels;
DROP POLICY IF EXISTS "channels_delete_authenticated" ON public.channels;
DROP POLICY IF EXISTS "channels_all_authenticated" ON public.channels;
DROP POLICY IF EXISTS "Allow all authenticated users on channels" ON public.channels;

-- 3) Cria política única que permite ALL (SELECT, INSERT, UPDATE, DELETE) para usuários autenticados
CREATE POLICY "channels_full_authenticated"
ON public.channels
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4) Garante que a coluna prompt existe com o nome certo
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS prompt text;
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS ai_prompt text;

-- 5) Confirmação: lista as políticas da tabela
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'channels' AND schemaname = 'public';
