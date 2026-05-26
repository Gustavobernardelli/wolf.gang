import { z } from 'zod';

export const feedSourceSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100),
  portal: z.string().min(1, 'Portal obrigatório'),
  feed_url: z
    .string()
    .min(1, 'URL obrigatória')
    .url('URL inválida — deve começar com http:// ou https://')
    .refine((u) => u.startsWith('http://') || u.startsWith('https://'), {
      message: 'Apenas URLs http/https são aceitas',
    }),
  category: z.string().nullable().optional(),
  language: z.string().default('pt-BR'),
  active: z.boolean().default(true),
  priority: z.number().int().min(1).max(10).default(5),
  parser_config: z.record(z.string(), z.any()).nullable().optional(),
});

export type FeedSourceFormData = z.infer<typeof feedSourceSchema>;
