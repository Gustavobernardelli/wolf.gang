import type { TextRegion } from './textRegion';

export type MockupFormat = 'feed_square' | 'feed_portrait' | 'reels' | 'stories' | 'blog_cover';

export type MockupFormatSpec = {
  format: MockupFormat;
  display_name: string;
  width: number;
  height: number;
  aspect_label: string;
  safe_area_top: number;
  safe_area_bottom: number;
  description: string | null;
};

export type Mockup = {
  id: string;
  publication_source_id: string;
  format: MockupFormat;
  name: string;
  description: string | null;
  category_tag: string | null;
  is_default: boolean;
  active: boolean;
  asset_id: string;
  width: number;
  height: number;
  text_regions: TextRegion[];
  background_layer: {
    enabled?: boolean;
    color?: string;
  };
  image_slot: {
    enabled?: boolean;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill';
    z_index?: 'below_mockup' | 'above_background';
  };
  preview_asset_id: string | null;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateMockupInput = Omit<Mockup, 'id' | 'usage_count' | 'last_used_at' | 'created_at' | 'updated_at'>;
export type UpdateMockupInput = Partial<CreateMockupInput>;

export type AvailableFont = {
  id: string;
  family: string;
  provider: string;
  weights_available: number[];
  css_url: string | null;
  preview_text: string;
  active: boolean;
  created_at: string;
};
