-- Migration: tabela app_settings
-- Configurações globais do Wolfgang (chave-valor em JSONB).
-- Permite que o admin configure parâmetros via UI sem precisar de migrations.
-- Exemplos de keys: "cron_schedule", "max_items_per_feed", "boost_keywords",
--                   "discard_keywords", "max_consecutive_errors"

create table public.app_settings (
  key         text        primary key,
  value       jsonb       not null,
  description text,
  updated_at  timestamptz not null default now()
);

-- Trigger de updated_at
create trigger app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.update_updated_at();

-- RLS
alter table public.app_settings enable row level security;

create policy "authenticated_full_access"
  on public.app_settings
  for all
  to authenticated
  using (true)
  with check (true);

create policy "service_role_full_access"
  on public.app_settings
  for all
  to service_role
  using (true)
  with check (true);

-- Valores padrão iniciais (configurações base do sistema)
insert into public.app_settings (key, value, description) values
  ('max_consecutive_errors',  '10',           'Número de erros consecutivos para desativar uma fonte automaticamente'),
  ('max_items_per_feed',      '50',           'Número máximo de itens a processar por feed por execução'),
  ('cron_schedule',           '"0 */2 * * *"','Expressão cron para coleta automática (padrão: a cada 2 horas)'),
  ('boost_keywords',          '[]',           'Array de palavras-chave que aumentam o relevance_score'),
  ('discard_keywords',        '[]',           'Array de palavras-chave para descartar automaticamente'),
  ('relevance_recency_weight','0.4',          'Peso do fator "recência" no cálculo do relevance_score (0-1)'),
  ('relevance_source_weight', '0.3',          'Peso do fator "prioridade da fonte" no relevance_score (0-1)'),
  ('relevance_keyword_weight','0.3',          'Peso de palavras-chave de boost no relevance_score (0-1)');
