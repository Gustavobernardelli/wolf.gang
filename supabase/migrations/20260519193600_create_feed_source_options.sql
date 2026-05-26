-- Migration: criar tabela feed_source_options
-- Cria a tabela para controlar dinamicamente opções de portais e categorias de fontes RSS

create table public.feed_source_options (
  id         uuid        primary key default gen_random_uuid(),
  type       text        not null check (type in ('portal', 'category')),
  name       text        not null,
  created_at timestamptz not null default now(),
  constraint unique_type_name unique (type, name)
);

-- Habilitar RLS
alter table public.feed_source_options enable row level security;

-- Políticas de RLS
create policy "authenticated_full_access"
  on public.feed_source_options
  for all
  to authenticated
  using (true)
  with check (true);

create policy "service_role_full_access"
  on public.feed_source_options
  for all
  to service_role
  using (true)
  with check (true);

create policy "anon_full_access"
  on public.feed_source_options
  for all
  to anon
  using (true)
  with check (true);

-- Cadastrar opções padrão de Portais
insert into public.feed_source_options (type, name) values
  ('portal', 'G1 – Globo'),
  ('portal', 'UOL'),
  ('portal', 'Folha de S.Paulo'),
  ('portal', 'CNN Brasil'),
  ('portal', 'BBC Brasil'),
  ('portal', 'Agência Brasil'),
  ('portal', 'Metrópoles'),
  ('portal', 'R7')
on conflict (type, name) do nothing;

-- Cadastrar opções padrão de Categorias
insert into public.feed_source_options (type, name) values
  ('category', 'Geral'),
  ('category', 'Economia'),
  ('category', 'Tecnologia'),
  ('category', 'Esportes'),
  ('category', 'Política'),
  ('category', 'Saúde'),
  ('category', 'Internacional')
on conflict (type, name) do nothing;
