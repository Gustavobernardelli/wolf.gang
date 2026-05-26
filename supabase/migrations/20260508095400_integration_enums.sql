-- Migration: enums de integrações

create type public.secret_kind as enum (
  'api_key',
  'webhook_url',
  'oauth_token',
  'bearer_token',
  'basic_auth',
  'custom'
);

create type public.secret_validation_status as enum (
  'unchecked',
  'valid',
  'invalid',
  'expired'
);

create type public.webhook_direction as enum (
  'outbound',   -- Wolfgang chama o endpoint externo
  'inbound'     -- endpoint do Wolfgang recebe chamadas
);

create type public.feed_validation_result as enum (
  'success',
  'partial',
  'failed'
);
