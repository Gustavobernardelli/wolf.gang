export type FeedSourceCategory =
  | 'geral' | 'economia' | 'tecnologia' | 'esportes'
  | 'politica' | 'saude' | 'internacional';

export type FeedSourcePortal =
  | 'g1' | 'uol' | 'folha' | 'cnn' | 'bbc'
  | 'agencia_brasil' | 'metropoles' | 'r7' | 'outro';

export interface FeedSource {
  id: string;
  name: string;
  portal: FeedSourcePortal | string;
  feed_url: string;
  category: FeedSourceCategory | null;
  language: string;
  active: boolean;
  priority: number;
  parser_config: Record<string, unknown> | null;
  last_fetched_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  consecutive_errors: number;
  created_at: string;
  updated_at: string;
  source_type?: string;
}

export interface FeedValidationLog {
  id: string;
  feed_source_id: string;
  triggered_by: string;
  status: 'success' | 'partial' | 'failed';
  http_status: number | null;
  response_time_ms: number | null;
  items_found: number;
  items_with_image: number;
  items_with_pubdate: number;
  sample_titles: string[] | null;
  schema_check: SchemaCheck;
  error_message: string | null;
  raw_sample: Record<string, unknown> | null;
  created_at: string;
}

export interface SchemaCheck {
  estimated_compatibility: 'full' | 'partial' | 'poor';
  fields_present: string[];
  fields_missing: string[];
  image_extraction_strategy: 'media_content' | 'enclosure' | 'html_parse' | 'none';
  warnings: string[];
}

export interface ValidationResult {
  ok: boolean;
  http_status?: number;
  response_time_ms?: number;
  error_code?: string;
  error_message?: string;
  feed_meta?: {
    title: string;
    language: string;
    items_count: number;
  };
  schema_check?: SchemaCheck;
  sample?: Array<{
    title: string;
    link: string;
    image_url: string | null;
    published_at: string | null;
  }>;
}
