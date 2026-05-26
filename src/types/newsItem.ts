export type NewsItemStatus = 'new' | 'processing' | 'published' | 'archived' | 'failed';

export interface NewsItem {
  id: string;
  source_id: string;
  external_id: string;
  guid: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  description_html: string | null;
  content: string | null;
  link: string;
  image_url: string | null;
  image_source_field: string | null;
  author: string | null;
  categories: string[] | null;
  portal: string;
  published_at: string;
  collected_at: string;
  raw_data: Record<string, unknown>;
  relevance_score: number | null;
  status: NewsItemStatus;
  created_at: string;
  updated_at: string;
  // joined from feed_sources
  feed_source?: { name: string; portal: string; category: string | null };
}
