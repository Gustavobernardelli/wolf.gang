import { z } from 'zod';

export const publicationSourceSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  slug: z.string().min(3, 'Slug deve ter pelo menos 3 caracteres').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hifens'),
  description: z.string().nullable().optional(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida (use #RRGGBB)'),
  is_active: z.boolean(),
  ai_prompt: z.string().nullable().optional(),
  prompt: z.string().nullable().optional(),
  token_meta: z.string().nullable().optional(),
  instagram_id: z.string().nullable().optional(),
  webhook: z.string().url('URL inválida').nullable().optional().or(z.literal('')),
});

export type PublicationSourceFormValues = z.infer<typeof publicationSourceSchema>;
