import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { secretsService, webhooksService } from '@/services/integrations/secrets.service';
import type { SecretFormData } from '@/lib/validators/secretSchema';

export const SECRETS_KEY = ['secrets'] as const;
export const WEBHOOKS_KEY = ['webhooks'] as const;

// ── Secrets ──────────────────────────────────────────────────────────────────

export function useSecrets(provider?: string) {
  return useQuery({
    queryKey: provider ? [...SECRETS_KEY, provider] : SECRETS_KEY,
    queryFn: () => secretsService.list(provider),
  });
}

export function useCreateSecret() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SecretFormData) => secretsService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SECRETS_KEY });
      toast.success('Credencial salva com segurança!');
    },
    onError: (err: Error) => toast.error(`Erro ao salvar: ${err.message}`),
  });
}

export function useRotateSecret() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) =>
      secretsService.updateValue(id, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SECRETS_KEY });
      toast.success('Valor rotacionado com sucesso!');
    },
    onError: (err: Error) => toast.error(`Erro ao rotacionar: ${err.message}`),
  });
}

export function useUpdateSecretMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string; name?: string; description?: string; active?: boolean; metadata?: Record<string, unknown> }) =>
      secretsService.updateMeta(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SECRETS_KEY });
      toast.success('Metadados atualizados!');
    },
    onError: (err: Error) => toast.error(`Erro: ${err.message}`),
  });
}

export function useDeleteSecret() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hard }: { id: string; hard?: boolean }) =>
      secretsService.delete(id, hard),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: SECRETS_KEY });
      toast.success(vars.hard ? 'Credencial excluída permanentemente' : 'Credencial desativada');
    },
    onError: (err: Error) => toast.error(`Erro: ${err.message}`),
  });
}

export function useTestSecret() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => secretsService.test(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: SECRETS_KEY });
      if (data.ok) toast.success(`Credencial válida: ${data.message}`);
      else toast.error(`Credencial inválida: ${data.message}`);
    },
    onError: (err: Error) => toast.error(`Erro no teste: ${err.message}`),
  });
}

// ── Webhooks ─────────────────────────────────────────────────────────────────

export function useWebhooks() {
  return useQuery({
    queryKey: WEBHOOKS_KEY,
    queryFn: webhooksService.list,
  });
}

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: webhooksService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WEBHOOKS_KEY });
      toast.success('Webhook adicionado!');
    },
    onError: (err: Error) => toast.error(`Erro: ${err.message}`),
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => webhooksService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WEBHOOKS_KEY });
      toast.success('Webhook removido');
    },
    onError: (err: Error) => toast.error(`Erro: ${err.message}`),
  });
}

export function useToggleWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      webhooksService.toggleActive(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: WEBHOOKS_KEY }),
    onError: (err: Error) => toast.error(`Erro: ${err.message}`),
  });
}
