import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mockupsService } from '@/services/mockups/mockups.service';
import { toast } from 'sonner';

export function useMockups(sourceId?: string) {
  const queryClient = useQueryClient();

  const { data: mockups, isLoading } = useQuery({
    queryKey: ['mockups', sourceId],
    queryFn: () => sourceId ? mockupsService.listBySource(sourceId) : Promise.resolve([]),
    enabled: !!sourceId,
  });

  const createMutation = useMutation({
    mutationFn: mockupsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mockups', sourceId] });
      toast.success('Mockup criado com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao salvar mockup: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => mockupsService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mockups', sourceId] });
      toast.success('Mockup atualizado com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar mockup: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: mockupsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mockups', sourceId] });
      toast.success('Mockup excluído com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir mockup: ${error.message}`);
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: ({ id, format }: { id: string; format: string }) => 
      mockupsService.setDefault(id, sourceId!, format),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mockups', sourceId] });
      toast.success('Mockup definido como padrão');
    },
    onError: (error: any) => {
      toast.error(`Erro ao definir padrão: ${error.message}`);
    },
  });

  return {
    mockups,
    isLoading,
    createMockup: createMutation.mutateAsync,
    updateMockup: updateMutation.mutateAsync,
    deleteMockup: deleteMutation.mutateAsync,
    setDefault: setDefaultMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
