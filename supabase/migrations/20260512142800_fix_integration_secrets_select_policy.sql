-- Corrige a visibilidade das credenciais no frontend permitindo leitura na tabela base
-- para que a view integration_secrets_safe com security_invoker=true consiga projetar os registros para o usuário autenticado.

DROP POLICY IF EXISTS "authenticated_select" ON public.integration_secrets;
CREATE POLICY "authenticated_select" 
  ON public.integration_secrets 
  FOR SELECT 
  TO authenticated 
  USING (true);
