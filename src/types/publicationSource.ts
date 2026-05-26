export interface TextElementLayout {
  x: number;
  y: number;
  width: number;    // % of canvas width
  height: number;   // % of canvas height (min-height of the box)
  fontFamily: string;
  fontSize: number;
  visible: boolean;
  bold?: boolean;
  color?: string;
  bgEnabled?: boolean;
  bgColor?: string;
}

export interface TextLayout {
  title: TextElementLayout;
  description: TextElementLayout;
}

export type PublicationSource = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  primary_color: string;
  is_active: boolean;
  ai_prompt: string | null;
  prompt: string | null;
  mockup_instagram_reels: string | null;
  mockup_instagram_feed: string | null;
  mockup_instagram_stories: string | null;
  mockup_facebook_reels: string | null;
  mockup_facebook_feed: string | null;
  mockup_facebook_stories: string | null;
  mockup_blog: string | null;
  text_layout: any;
  token_meta: string | null;
  instagram_id: string | null;
  webhook: string | null;
  webhook_url?: string | null;
  created_at: string;
  updated_at: string;
};

export type CreatePublicationSourceInput = {
  name: string;
  slug: string;
  is_active: boolean;
  description?: string | null;
  primary_color?: string;
  ai_prompt?: string | null;
  prompt?: string | null;
  mockup_instagram_reels?: string | null;
  mockup_instagram_feed?: string | null;
  mockup_instagram_stories?: string | null;
  mockup_facebook_reels?: string | null;
  mockup_facebook_feed?: string | null;
  mockup_facebook_stories?: string | null;
  mockup_blog?: string | null;
  text_layout?: any;
  token_meta?: string | null;
  instagram_id?: string | null;
  webhook?: string | null;
};
export type UpdatePublicationSourceInput = Partial<CreatePublicationSourceInput>;
