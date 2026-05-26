import { supabase } from '@/lib/supabase';

export interface UploadMockupResponse {
  ok: boolean;
  asset?: any;
  deduplicated?: boolean;
  error_code?: string;
  error_message?: string;
  details?: any;
}

export const mockupUploadService = {
  async upload(file: File, publicationSourceId: string, format: string, name: string): Promise<UploadMockupResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('publication_source_id', publicationSourceId);
    formData.append('format', format);
    formData.append('name', name);

    const { data, error } = await supabase.functions.invoke('upload-mockup', {
      body: formData,
    });

    if (error) {
      console.error('Edge function error:', error);
      return { ok: false, error_message: error.message };
    }

    return data as UploadMockupResponse;
  },
};
