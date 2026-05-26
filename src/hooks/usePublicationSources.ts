import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { publicationSourcesService } from '@/services/mockups/publicationSources.service';
import { toast } from 'sonner';

export function usePublicationSources() {
  const queryClient = useQueryClient();

  const { data: sources, isLoading } = useQuery({
    queryKey: ['publication-sources'],
    queryFn: () => publicationSourcesService.list(),
  });

  const createMutation = useMutation({
    mutationFn: publicationSourcesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publication-sources'] });
      toast.success('Fonte de publicação criada com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar fonte: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => publicationSourcesService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publication-sources'] });
      toast.success('Fonte atualizada com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar fonte: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: publicationSourcesService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publication-sources'] });
      toast.success('Fonte excluída com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir fonte: ${error.message}`);
    },
  });

  return {
    sources,
    isLoading,
    createSource: createMutation.mutateAsync,
    updateSource: updateMutation.mutateAsync,
    deleteSource: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
