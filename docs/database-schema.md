# Wolfgang — Database Schema

**Projeto Supabase:** `atkstqfnwdbwhplukkiq`  
**Schema criado em:** 2026-05-08  
**Migrations aplicadas:** 9

---

## Diagrama de Relações

```
┌─────────────────────┐
│     feed_sources    │
│─────────────────────│
│ id (PK)             │
│ name                │
│ portal              │
│ feed_url (UNIQUE)   │
│ category            │
│ language            │
│ active              │
│ priority            │
│ parser_config       │
│ last_fetched_at     │
│ last_success_at     │
│ last_error          │
│ consecutive_errors  │
│ created_at          │
│ updated_at          │
└──────────┬──────────┘
           │ 1
           │ ON DELETE CASCADE
           │ N
┌──────────▼──────────┐          ┌─────────────────────┐
│      news_items     │    N:M   │   collection_runs   │
│─────────────────────│──────────│─────────────────────│
│ id (PK)             │          │ id (PK)             │
│ source_id (FK)      │          │ triggered_by        │
│ external_id         │          │ status (enum)       │
│ guid                │          │ started_at          │
│ title               │          │ finished_at         │
│ subtitle            │          │ duration_ms (gen)   │
│ description         │          │ sources_total       │
│ description_html    │          │ sources_success     │
│ content             │          │ sources_failed      │
│ link (UNIQUE)       │          │ items_collected     │
│ image_url           │          │ items_new           │
│ image_source_field  │          │ items_duplicated    │
│ author              │          │ errors (jsonb)      │
│ categories (text[]) │          │ metadata (jsonb)    │
│ portal              │          │ created_at          │
│ published_at        │          └──────────┬──────────┘
│ collected_at        │                     │
│ raw_data (jsonb)    │          ┌──────────▼──────────┐
│ relevance_score     │          │ collection_run_items │
│ status (enum)       │◄─────────│─────────────────────│
│ created_at          │          │ id (PK)             │
│ updated_at          │          │ run_id (FK)         │
└─────────────────────┘          │ news_item_id (FK)   │
                                 │ was_new             │
                                 │ created_at          │
                                 └─────────────────────┘

┌─────────────────────┐
│     app_settings    │
│─────────────────────│  (standalone, sem FKs)
│ key (PK)            │
│ value (jsonb)       │
│ description         │
│ updated_at          │
└─────────────────────┘
```

---

## Enums

### `news_item_status`
| Valor | Descrição |
|-------|-----------|
| `new` | Recém coletada, não revisada |
| `reviewed` | Vista pelo admin |
| `selected` | Escolhida para virar arte/post |
| `published` | Publicada em algum canal |
| `archived` | Arquivada manualmente |
| `discarded` | Descartada (não relevante) |
| `duplicate` | Marcada como duplicata |

### `collection_run_status`
| Valor | Descrição |
|-------|-----------|
| `running` | Execução em andamento |
| `success` | Concluída sem erros |
| `partial_success` | Concluída com alguns erros |
| `failed` | Falhou completamente |

---

## Tabelas

### `feed_sources`
Fontes RSS cadastradas. Um portal pode ter vários feeds (G1 Geral, G1 Economia, etc.).

| Coluna | Tipo | Constraint | Descrição |
|--------|------|------------|-----------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `name` | text | NOT NULL | Nome amigável: "G1 - Economia" |
| `portal` | text | NOT NULL | Slug do portal: "g1", "uol", "folha" |
| `feed_url` | text | NOT NULL, UNIQUE | URL do XML RSS |
| `category` | text | nullable | "geral", "economia", "tecnologia", etc. |
| `language` | text | default 'pt-BR' | Idioma do feed |
| `active` | boolean | default true | Desativa sem deletar |
| `priority` | smallint | default 5, check 1–10 | 1=mais importante, 10=menos |
| `parser_config` | jsonb | nullable | Config específica de parsing por fonte |
| `last_fetched_at` | timestamptz | nullable | Última tentativa de coleta |
| `last_success_at` | timestamptz | nullable | Última coleta bem-sucedida |
| `last_error` | text | nullable | Mensagem do último erro |
| `consecutive_errors` | integer | default 0 | Auto-desativa ao atingir limite |
| `created_at` | timestamptz | NOT NULL, default now() | — |
| `updated_at` | timestamptz | NOT NULL, default now() | Atualizado por trigger |

**Índices:**
- `UNIQUE (feed_url)`
- `(active, last_fetched_at)` — query do coletor
- `(portal)` — filtro por portal

---

### `news_items`
Notícias coletadas. Schema flexível para acomodar variações entre portais (G1, UOL, etc.).

| Coluna | Tipo | Constraint | Descrição |
|--------|------|------------|-----------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `source_id` | uuid | FK → feed_sources, CASCADE | Fonte de origem |
| `external_id` | text | NOT NULL | SHA-256 do guid ou link |
| `guid` | text | nullable | GUID original do RSS |
| `title` | text | NOT NULL | Título da notícia |
| `subtitle` | text | nullable | `<atom:subtitle>` quando disponível |
| `description` | text | nullable | Texto sem HTML |
| `description_html` | text | nullable | HTML original |
| `content` | text | nullable | Corpo completo quando disponível |
| `link` | text | NOT NULL, UNIQUE | URL canônica da matéria |
| `image_url` | text | nullable | URL da imagem de capa (externa) |
| `image_source_field` | text | nullable | Debug: origem da imagem extraída |
| `image_asset_id` | uuid | FK → media_assets, SET NULL | ID da imagem processada e salva no Storage local |
| `image_download_status`| enum | NOT NULL, default 'pending' | Status ('pending', 'success', 'failed', 'skipped', 'no_image') |
| `image_download_error` | text | nullable | Erro do último download |
| `image_download_attempts`| smallint | default 0 | Tentativas de download falhas |
| `image_processed_at` | timestamptz| nullable | Data do processamento de imagem |
| `author` | text | nullable | Autor da matéria |
| `categories` | text[] | nullable | Array de categorias do RSS |
| `portal` | text | NOT NULL | Denormalizado de feed_sources |
| `published_at` | timestamptz | NOT NULL | Data de publicação em UTC |
| `collected_at` | timestamptz | NOT NULL, default now() | Data da coleta |
| `raw_data` | jsonb | NOT NULL | Item RSS original completo |
| `relevance_score` | numeric(5,2) | nullable | NULL = ainda não pontuado |
| `status` | news_item_status | default 'new' | Ciclo de vida da notícia |
| `created_at` | timestamptz | NOT NULL | — |
| `updated_at` | timestamptz | NOT NULL | Atualizado por trigger |

**Constraints:**
- `UNIQUE (source_id, external_id)` — sem duplicatas por fonte
- `UNIQUE (link)` — mesmo link de fontes diferentes não duplica
- `CHECK published_at <= now() + 1 hour` — bloqueia datas absurdas

**Índices:**
| Nome | Tipo | Colunas |
|------|------|---------|
| `idx_news_items_status_published` | btree | `(status, published_at DESC)` |
| `idx_news_items_portal_published` | btree | `(portal, published_at DESC)` |
| `idx_news_items_published_at` | btree | `(published_at DESC)` |
| `idx_news_items_relevance` | btree | `(relevance_score DESC NULLS LAST)` |
| `idx_news_items_categories` | GIN | `categories` |
| `idx_news_items_raw_data` | GIN | `raw_data` |
| `idx_news_items_source_id` | btree | `source_id` |
| `idx_news_items_image_pending_failed` | btree | `(image_download_status)` |

---

### `media_assets`
Centraliza o armazenamento de imagens físicas no Storage (Midia), evitando salvar a mesma imagem múltiplas vezes através de deduplicação por Hash (SHA-256).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | `gen_random_uuid()` |
| `hash_sha256` | text | NOT NULL, UNIQUE (Hash do ArrayBuffer da imagem baixada) |
| `bucket` | text | NOT NULL, default 'Midia' |
| `storage_path` | text | NOT NULL, UNIQUE (Ex: Imagens/2026/05/08/abcdef1234567890.webp) |
| `public_url` | text | NOT NULL (URL pública gerada pelo Supabase) |
| `original_url` | text | (Nullable) URL original de onde foi extraída |
| `original_mime_type`| text | (Nullable) ex: image/jpeg, image/png |
| `original_size_bytes`| integer| (Nullable) |
| `processed_mime_type`| text | Default 'image/webp' |
| `processed_size_bytes`| integer| (Nullable) |
| `width` | integer | (Nullable) |
| `height` | integer | (Nullable) |
| `was_resized` | boolean | Default false |
| `processing_metadata`| jsonb | Default '{}' |
| `reference_count` | integer | Conta qts itens de news_items usam a imagem. Default 0 |
| `created_at` | timestamptz| — |
| `updated_at` | timestamptz| Atualizado por trigger |

**Índices:**
- `UNIQUE (hash_sha256)`
- `UNIQUE (storage_path)`
- `idx_media_assets_ref_count` `(reference_count)`

---

### `collection_runs`
Log de cada execução do coletor. Essencial para debug e widget de status na UI.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | — |
| `triggered_by` | text | "cron", "manual" ou "api" |
| `status` | collection_run_status | Estado da execução |
| `started_at` | timestamptz | Início |
| `finished_at` | timestamptz | Fim (nullable) |
| `duration_ms` | integer GENERATED | `(finished_at - started_at)` em ms |
| `sources_total` | integer | Total de fontes processadas |
| `sources_success` | integer | Fontes bem-sucedidas |
| `sources_failed` | integer | Fontes com erro |
| `items_collected` | integer | Total de itens lidos |
| `items_new` | integer | Itens efetivamente inseridos |
| `items_duplicated` | integer | Itens ignorados por duplicata |
| `errors` | jsonb | Array de `{source_id, source_name, error_message, timestamp}` |
| `metadata` | jsonb | Informações adicionais livres |
| `created_at` | timestamptz | — |

---

### `collection_run_items`
Tabela de junção entre `collection_runs` e `news_items`.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | — |
| `run_id` | uuid FK → collection_runs CASCADE | — |
| `news_item_id` | uuid FK → news_items CASCADE | — |
| `was_new` | boolean | true = inserção nova, false = duplicata |
| `created_at` | timestamptz | — |

**Constraint:** `UNIQUE (run_id, news_item_id)`

---

### `app_settings`
Configurações globais chave-valor. Permite ajustes via UI sem migrations.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `key` | text PK | Identificador da configuração |
| `value` | jsonb | Valor (qualquer tipo JSON) |
| `description` | text | Documentação do parâmetro |
| `updated_at` | timestamptz | Atualizado por trigger |

---

## Views

### `news_items_with_image`
Faz o JOIN automático entre a tabela `news_items` e `media_assets` para facilitar o uso no Frontend.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `(todas as colunas do news_items)` | ... | ... |
| `display_image_url` | text | URL local otimizada (se houver) ou URL externa original (fallback) |
| `image_width` | integer | Largura da imagem |
| `image_height` | integer | Altura da imagem |
| `has_local_image` | boolean | Indica se a imagem foi baixada pro storage do Wolfgang |

---

## Funções e Triggers

### Trigger function: `update_updated_at()`
Atualizada automaticamente em qualquer `UPDATE`. Aplicada em: `feed_sources`, `news_items`, `media_assets`, `app_settings`.

### Trigger function: `sync_media_asset_ref_count`
Gatilho associado a INSERT, UPDATE e DELETE na tabela `news_items` para incrementar/decrementar a contagem na coluna `reference_count` de `media_assets`. Garante que sabemos se uma imagem está "órfã".

### `compute_external_id(p_link, p_guid)`
Retorna `SHA-256(guid)` se guid existir, senão `SHA-256(link)`. Garante deduplicação robusta.

### `cleanup_orphan_assets(days_old)`
Função utilitária que lista todos os assets onde `reference_count = 0` há mais de N dias para futura exclusão programada.

### `increment_source_error(p_source_id, p_error_msg)`
Incrementa `consecutive_errors`, registra `last_error` e auto-desativa a fonte ao atingir o limite configurado em `app_settings.max_consecutive_errors`.

### `reset_source_errors(p_source_id)`
Zera `consecutive_errors`, limpa `last_error`, atualiza `last_success_at`.

---

## RLS (Row Level Security)

Todas as tabelas têm RLS habilitado com duas políticas padrão de Full Access para roles específicas:
`authenticated` (uso via UI) e `service_role` (uso via Edge Functions).

---

## Migrations aplicadas
| Arquivo | Descrição |
|---------|-----------|
| `20260508094500_...` a `20260508095300_...` | Estrutura de notícias, coletas, settings e funções |
| `20260508103000_media_assets_and_news_items.sql` | Estrutura de armazenamento de mídia, view e referências de imagem |
| `20260508103500_storage_midia_policies.sql` | Permissões de RLS para o Supabase Storage (bucket Midia) |
| `20260508110000_mockups_schema.sql` | Estrutura de Mockups e Fontes de Publicação |

---

## Tabelas de Design e Mockups

### `publication_sources`
Representa as marcas ou canais de destino (ex: "Cura Política").

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | — |
| `name` | text | Nome amigável |
| `slug` | text | UNIQUE, usado no Storage (ex: 'cura-politica') |
| `description` | text | — |
| `brand_color_primary` | text | Hex code #RRGGBB |
| `brand_color_secondary` | text | Hex code #RRGGBB |
| `default_font_family` | text | FK opcional para available_fonts |
| `logo_asset_id` | uuid | FK → media_assets |
| `active` | boolean | — |
| `created_at` | timestamptz | — |

---

### `mockups`
Templates PNG com regiões de texto dinâmicas.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | — |
| `publication_source_id` | uuid | FK → publication_sources |
| `format` | mockup_format | enum (feed_square, reels, etc.) |
| `name` | text | Nome do template |
| `category_tag` | text | Tag livre para organização |
| `asset_id` | uuid | FK → media_assets (O PNG transparente) |
| `width` | integer | — |
| `height` | integer | — |
| `text_regions` | jsonb | Array de `TextRegion` (coord, fontes, cores) |
| `image_slot` | jsonb | Config do slot da imagem da notícia |
| `background_layer` | jsonb | Camada de cor de fundo |
| `is_default` | boolean | Mockup padrão do formato para a fonte |
| `active` | boolean | — |

**Indices:**
- `UNIQUE (publication_source_id, format, is_default)` onde `is_default = true` (via Trigger)

---

### `available_fonts`
Catálogo de fontes disponíveis para o sistema.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | — |
| `family` | text | Nome da família (ex: 'Inter') |
| `provider` | text | 'google', 'local', 'custom' |
| `weights_available` | int[] | Array de pesos (ex: [400, 700]) |
| `css_url` | text | Link para o CSS da fonte |
| `preview_text` | text | — |
| `active` | boolean | — |
