import { z } from 'zod';
import { textRegionSchema } from './textRegionSchema';

export const mockupSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  description: z.string().nullable().optional(),
  category_tag: z.string().nullable().optional(),
  format: z.enum(['feed_square', 'feed_portrait', 'reels', 'stories', 'blog_cover']),
  is_default: z.boolean().default(false),
  active: z.boolean().default(true),
  asset_id: z.string().uuid('Asset ID inválido'),
  width: z.number(),
  height: z.number(),
  text_regions: z.array(textRegionSchema).default([]),
  background_layer: z.object({
    enabled: z.boolean().optional(),
    color: z.string().optional(),
  }).default({}),
  image_slot: z.object({
    enabled: z.boolean().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    fit: z.enum(['cover', 'contain', 'fill']).optional(),
    z_index: z.enum(['below_mockup', 'above_background']).optional(),
  }).default({}),
});

export type MockupFormValues = z.infer<typeof mockupSchema>;
