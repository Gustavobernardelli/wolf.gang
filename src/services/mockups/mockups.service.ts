import { supabase } from '@/lib/supabase';
import type { Mockup, CreateMockupInput, UpdateMockupInput, MockupFormatSpec } from '@/types/mockup';
import { mockupUploadService } from './mockupUpload.service';
import type { MockupUploads } from '@/pages/mockups/components/sources/AddSourceDialog';

export const mockupsService = {
  async listBySource(sourceId: string): Promise<Mockup[]> {
    const { data, error } = await supabase
      .from('mockups')
      .select('*')
      .eq('publication_source_id', sourceId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<Mockup> {
    const { data, error } = await supabase
      .from('mockups')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(payload: CreateMockupInput): Promise<Mockup> {
    const { data, error } = await supabase
      .from('mockups')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: UpdateMockupInput): Promise<Mockup> {
    const { data, error } = await supabase
      .from('mockups')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('mockups')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getFormatSpecs(): Promise<MockupFormatSpec[]> {
    const { data, error } = await supabase
      .from('mockup_format_specs')
      .select('*')
      .order('display_name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async setDefault(id: string, sourceId: string, format: string): Promise<void> {
    // The database trigger handles unsetting the previous default.
    const { error } = await supabase
      .from('mockups')
      .update({ is_default: true })
      .eq('id', id);
    if (error) throw error;
  },

  async bulkUploadMockups(sourceId: string, uploads: MockupUploads): Promise<void> {
    const uploadPromises = Object.entries(uploads).map(([formatKey, data]) => 
      mockupUploadService.upload(data.file, sourceId, formatKey, data.label)
    );

    const results = await Promise.all(uploadPromises);
    
    const errors = results.filter(r => !r.ok);
    if (errors.length > 0) {
      console.error('Some mockups failed to upload:', errors);
      // We don't necessarily want to throw here if some succeeded, 
      // but maybe we should at least toast? Or throw to let the caller handle.
      throw new Error(`Falha ao enviar ${errors.length} mockup(s).`);
    }
  },
};
