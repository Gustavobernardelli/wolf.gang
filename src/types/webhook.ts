export type WebhookDirection = 'outbound' | 'inbound';
export type WebhookMethod = 'GET' | 'POST' | 'PUT' | 'PATCH';

export const WEBHOOK_EVENT_TYPES = [
  'news.collected',
  'news.published',
  'art.generated',
  'art.published',
  'schedule.triggered',
  'schedule.failed',
  'feed.error',
  'test',
] as const;

export type WebhookEventType = typeof WEBHOOK_EVENT_TYPES[number];

export interface WebhookEndpoint {
  id: string;
  name: string;
  direction: WebhookDirection;
  url: string;
  method: WebhookMethod;
  event_types: string[] | null;
  headers: Record<string, string>;
  secret_id: string | null;
  signature_header: string | null;
  signature_algo: string | null;
  active: boolean;
  last_triggered_at: string | null;
  last_status: number | null;
  failure_count: number;
  created_at: string;
  updated_at: string;
}
