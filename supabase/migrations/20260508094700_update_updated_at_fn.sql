-- Migration: função trigger para atualizar updated_at automaticamente
-- Será usada por todas as tabelas que possuem a coluna updated_at

create or replace function public.update_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
