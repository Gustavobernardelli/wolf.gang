import { supabase } from '@/lib/supabase';
import type { PublicationSource, CreatePublicationSourceInput, UpdatePublicationSourceInput } from '@/types/publicationSource';

export const publicationSourcesService = {
  async list(): Promise<PublicationSource[]> {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<PublicationSource> {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(payload: CreatePublicationSourceInput): Promise<PublicationSource> {
    const { data, error } = await supabase
      .from('channels')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: UpdatePublicationSourceInput): Promise<PublicationSource> {
    const { data, error } = await supabase
      .from('channels')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('channels')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
