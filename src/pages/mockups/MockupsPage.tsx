import { useState } from 'react';
import { usePublicationSources } from '@/hooks/usePublicationSources';
import { useQueryClient } from '@tanstack/react-query';
import { SourcesList } from './components/sources/SourcesList';
import { AddSourceDialog } from './components/sources/AddSourceDialog';
import type { PublicationSource } from '@/types/publicationSource';
import { supabase } from '@/lib/supabase';
import { publicationSourcesService } from '@/services/mockups/publicationSources.service';
import { toast } from 'sonner';
import type { MockupUploads } from './components/sources/AddSourceDialog';
import type { PublicationSourceFormValues } from '@/lib/validators/publicationSourceSchema';
import type { TextLayout } from '@/types/publicationSource';

async function uploadMockupsToChannel(channelId: string, slug: string, files: MockupUploads) {
  const updates: Record<string, string> = {};

  // Busca o canal atual para identificar os arquivos antigos
  const currentChannel = await publicationSourcesService.getById(channelId).catch(() => null);

  await Promise.all(
    Object.entries(files).map(async ([, { file, column }]) => {
      // 1. Remove o arquivo antigo do storage, se existir
      if (currentChannel) {
        const oldUrl = (currentChannel as any)[column] as string | null;
        if (oldUrl && oldUrl.includes('/public/Midia/')) {
          const oldPath = oldUrl.split('/public/Midia/')[1];
          if (oldPath) {
            await supabase.storage.from('Midia').remove([decodeURIComponent(oldPath)]);
          }
        }
      }

      // 2. Salva o novo arquivo com timestamp no nome para atualizar a URL e evitar cache
      const ext = file.name.split('.').pop() ?? 'png';
      const path = `mockups/${slug}/${column}_${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from('Midia')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (error) throw new Error(`Falha ao enviar ${column}: ${error.message}`);

      const { data: { publicUrl } } = supabase.storage.from('Midia').getPublicUrl(path);
      updates[column] = publicUrl;
    })
  );

  if (Object.keys(updates).length > 0) {
    await publicationSourcesService.update(channelId, updates);
  }
}

export default function MockupsPage() {
  const queryClient = useQueryClient();
  const { sources, isLoading, createSource, updateSource, deleteSource, isCreating, isUpdating } = usePublicationSources();

  const [isAddOpen, setIsAddOpen] = useState(false);
  /** When set, the same AddSourceDialog opens in edit mode */
  const [editingSource, setEditingSource] = useState<PublicationSource | null>(null);

  const handleDelete = async (source: PublicationSource) => {
    if (confirm(`Deseja realmente excluir o canal "${source.name}"?`)) {
      await deleteSource(source.id);
    }
  };

  const handleSave = async (values: PublicationSourceFormValues, files: MockupUploads, textLayout: any) => {
    try {
      if (editingSource) {
        const payload = {
          ...values,
          prompt: values.prompt ?? values.ai_prompt ?? null,
          ai_prompt: values.prompt ?? values.ai_prompt ?? null,
          text_layout: textLayout,
        };
        await updateSource({ id: editingSource.id, payload });

        const fileCount = Object.keys(files).length;
        if (fileCount > 0) {
          toast.info(`Enviando ${fileCount} página(s)...`);
          await uploadMockupsToChannel(editingSource.id, editingSource.slug, files);
          toast.success('Páginas atualizadas com sucesso!');
        }

        queryClient.invalidateQueries({ queryKey: ['publication-sources'] });
        setEditingSource(null);
      } else {
        // Create mode
        const createPayload = {
          ...values,
          prompt: values.prompt ?? values.ai_prompt ?? null,
          ai_prompt: values.prompt ?? values.ai_prompt ?? null,
          text_layout: textLayout,
        };
        const newChannel = await createSource(createPayload);

        const fileCount = Object.keys(files).length;
        if (fileCount > 0) {
          toast.info(`Enviando ${fileCount} página(s)...`);
          await uploadMockupsToChannel(newChannel.id, newChannel.slug, files);
          toast.success('Páginas enviadas com sucesso!');
        }

        queryClient.invalidateQueries({ queryKey: ['publication-sources'] });
        setIsAddOpen(false);
      }
    } catch (error: any) {
      toast.error(`Erro ao salvar canal: ${error.message}`);
    }
  };

  const isDialogOpen = isAddOpen || !!editingSource;

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Canais</h1>
          <p className="text-white/50">
            Gerencie seus canais de publicação e as páginas de template para cada formato.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-white/5 animate-pulse rounded-xl border border-white/5" />
          ))}
        </div>
      ) : (
        <SourcesList
          sources={sources || []}
          onAdd={() => setIsAddOpen(true)}
          onEdit={setEditingSource}
          onDelete={handleDelete}
          onSelect={setEditingSource}
        />
      )}

      {/* Single dialog used for both create and edit */}
      <AddSourceDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditingSource(null);
          }
        }}
        source={editingSource}
        onSave={handleSave}
        isSaving={isCreating || isUpdating}
      />
    </div>
  );
}
