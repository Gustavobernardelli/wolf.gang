import { supabase } from '@/lib/supabase';
import type { FeedSource, FeedValidationLog } from '@/types/feedSource';
import type { FeedSourceFormData } from '@/lib/validators/feedSourceSchema';

export const feedSourcesService = {
  async list(): Promise<FeedSource[]> {
    const { data, error } = await supabase
      .from('feed_sources')
      .select('*')
      .order('priority', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<FeedSource> {
    const { data, error } = await supabase
      .from('feed_sources')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(payload: FeedSourceFormData): Promise<FeedSource> {
    const { data, error } = await supabase
      .from('feed_sources')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: Partial<FeedSourceFormData>): Promise<FeedSource> {
    const { data, error } = await supabase
      .from('feed_sources')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async toggleActive(id: string, active: boolean): Promise<void> {
    const { error } = await supabase
      .from('feed_sources')
      .update({ active })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('feed_sources')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getValidationLogs(feedSourceId: string, limit = 10): Promise<FeedValidationLog[]> {
    const { data, error } = await supabase
      .from('feed_validation_logs')
      .select('*')
      .eq('feed_source_id', feedSourceId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async getLastValidation(feedSourceId: string): Promise<FeedValidationLog | null> {
    const { data } = await supabase
      .from('feed_validation_logs')
      .select('*')
      .eq('feed_source_id', feedSourceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  },

  async listOptions(): Promise<{ id: string; type: 'portal' | 'category'; name: string }[]> {
    const { data, error } = await supabase
      .from('feed_source_options')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async createOption(type: 'portal' | 'category', name: string): Promise<{ id: string; type: 'portal' | 'category'; name: string }> {
    const { data, error } = await supabase
      .from('feed_source_options')
      .insert({ type, name })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },
};
