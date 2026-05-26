import { z } from 'zod';
import { WEBHOOK_EVENT_TYPES } from '@/types/webhook';

export const secretSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100),
  provider: z.string().min(1, 'Provider obrigatório'),
  kind: z.enum(['api_key', 'webhook_url', 'oauth_token', 'bearer_token', 'basic_auth', 'custom']),
  value: z.string().min(8, 'O valor deve ter no mínimo 8 caracteres'),
  description: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.any()).optional().default({}),
  test_on_create: z.boolean().optional().default(false),
});

export const rotateSecretSchema = z.object({
  value: z.string().min(8, 'O novo valor deve ter no mínimo 8 caracteres'),
  confirmation: z.string(),
}).superRefine((data, ctx) => {
  // confirmation field validated externally against secret name
  if (!data.confirmation) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Confirmação obrigatória', path: ['confirmation'] });
  }
});

export const updateSecretMetaSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  active: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type SecretFormData = z.infer<typeof secretSchema>;
export type RotateSecretData = z.infer<typeof rotateSecretSchema>;

export const webhookSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100),
  direction: z.enum(['outbound', 'inbound']),
  url: z.string().url('URL inválida'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH']).default('POST'),
  event_types: z.array(z.string()).optional(),
  headers: z.record(z.string(), z.string()).optional().default({}),
  secret_id: z.string().uuid().nullable().optional(),
  signature_header: z.string().nullable().optional(),
  active: z.boolean().default(true),
});

export type WebhookFormData = z.infer<typeof webhookSchema>;
