import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { feedSourcesService } from '@/services/integrations/feedSources.service';
import type { FeedSourceFormData } from '@/lib/validators/feedSourceSchema';

export const FEED_SOURCES_KEY = ['feed-sources'] as const;

export function useFeedSources() {
  return useQuery({
    queryKey: FEED_SOURCES_KEY,
    queryFn: feedSourcesService.list,
  });
}

export function useFeedSourceValidationLogs(feedSourceId: string | null) {
  return useQuery({
    queryKey: ['feed-validation-logs', feedSourceId],
    queryFn: () => feedSourcesService.getValidationLogs(feedSourceId!),
    enabled: !!feedSourceId,
  });
}

export function useCreateFeedSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FeedSourceFormData) => feedSourcesService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FEED_SOURCES_KEY });
      toast.success('Fonte RSS adicionada com sucesso!');
    },
    onError: (err: Error) => toast.error(`Erro ao adicionar fonte: ${err.message}`),
  });
}

export function useUpdateFeedSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FeedSourceFormData> }) =>
      feedSourcesService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FEED_SOURCES_KEY });
      toast.success('Fonte atualizada!');
    },
    onError: (err: Error) => toast.error(`Erro ao atualizar: ${err.message}`),
  });
}

export function useToggleFeedSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      feedSourcesService.toggleActive(id, active),
    onMutate: async ({ id, active }) => {
      await qc.cancelQueries({ queryKey: FEED_SOURCES_KEY });
      const prev = qc.getQueryData(FEED_SOURCES_KEY);
      qc.setQueryData(FEED_SOURCES_KEY, (old: Awaited<ReturnType<typeof feedSourcesService.list>> | undefined) =>
        old?.map((s) => s.id === id ? { ...s, active } : s) ?? []
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(FEED_SOURCES_KEY, ctx.prev);
      toast.error('Erro ao atualizar status');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: FEED_SOURCES_KEY }),
  });
}

export function useDeleteFeedSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => feedSourcesService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FEED_SOURCES_KEY });
      toast.success('Fonte removida');
    },
    onError: (err: Error) => toast.error(`Erro ao remover: ${err.message}`),
  });
}
