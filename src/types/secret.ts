export type SecretKind =
  | 'api_key' | 'webhook_url' | 'oauth_token'
  | 'bearer_token' | 'basic_auth' | 'custom';

export type SecretValidationStatus = 'unchecked' | 'valid' | 'invalid' | 'expired';

export type SecretProvider =
  | 'meta_graph' | 'openai' | 'anthropic' | 'bannerbear'
  | 'wordpress' | 'ghost' | 'custom_webhook' | 'custom' | 'google';

export interface IntegrationSecret {
  id: string;
  name: string;
  provider: SecretProvider | string;
  kind: SecretKind;
  value_preview: string;
  value_hash: string;
  metadata: Record<string, unknown>;
  description: string | null;
  active: boolean;
  last_used_at: string | null;
  last_validated_at: string | null;
  validation_status: SecretValidationStatus;
  validation_message: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export const PROVIDER_LABELS: Record<string, string> = {
  meta_graph: 'Meta Graph API',
  openai: 'OpenAI',
  google: 'Google (Gemini)',
  anthropic: 'Anthropic',
  bannerbear: 'Bannerbear',
  wordpress: 'WordPress',
  ghost: 'Ghost',
  custom_webhook: 'Webhook Customizado',
  custom: 'Personalizado',
};

export const PROVIDER_COLORS: Record<string, string> = {
  meta_graph: '#1877F2',
  openai: '#10a37f',
  google: '#4285F4',
  anthropic: '#d97706',
  bannerbear: '#7c3aed',
  wordpress: '#21759B',
  ghost: '#15171A',
  custom_webhook: '#6366f1',
  custom: '#6b7280',
};

export const KIND_LABELS: Record<SecretKind, string> = {
  api_key: 'API Key',
  webhook_url: 'Webhook URL',
  oauth_token: 'OAuth Token',
  bearer_token: 'Bearer Token',
  basic_auth: 'Basic Auth',
  custom: 'Personalizado',
};
