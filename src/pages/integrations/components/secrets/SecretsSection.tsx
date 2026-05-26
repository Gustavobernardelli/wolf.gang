import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Plus, KeyRound, Webhook, Globe, Loader2 } from 'lucide-react';
import { SecretRow } from './SecretRow';
import { AddSecretDialog } from './AddSecretDialog';
import { useSecrets, useWebhooks, useDeleteWebhook, useToggleWebhook } from '@/hooks/useSecrets';
import { validationService } from '@/services/integrations/validation.service';
import { PROVIDER_LABELS, type IntegrationSecret } from '@/types/secret';
import { ProviderIcon } from './ProviderIcon';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function EmptySecrets({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
        <KeyRound className="w-7 h-7 text-indigo-400" />
      </div>
      <h3 className="text-base font-semibold text-zinc-200 mb-2">Nenhuma credencial cadastrada</h3>
      <p className="text-sm text-zinc-500 max-w-xs mb-5">
        Adicione API keys e tokens para conectar o Wolfgang com provedores externos.
      </p>
      <Button onClick={onAdd} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
        <Plus className="w-3.5 h-3.5" /> Adicionar Credencial
      </Button>
    </div>
  );
}

function EmptyWebhooks() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Webhook className="w-10 h-10 text-zinc-600 mb-3" />
      <p className="text-sm text-zinc-500">Nenhum webhook cadastrado</p>
    </div>
  );
}

export function SecretsSection() {
  const [addOpen, setAddOpen] = useState(false);
  const [defaultProvider, setDefaultProvider] = useState<string | undefined>();
  const [editingSecret, setEditingSecret] = useState<IntegrationSecret | null>(null);
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);

  const { data: secrets = [], isLoading: secretsLoading } = useSecrets();
  const { data: webhooks = [], isLoading: webhooksLoading } = useWebhooks();
  const delWebhook = useDeleteWebhook();
  const toggleWebhook = useToggleWebhook();

  // Group secrets by provider
  const byProvider = secrets.reduce<Record<string, typeof secrets>>((acc, s) => {
    if (!acc[s.provider]) acc[s.provider] = [];
    acc[s.provider].push(s);
    return acc;
  }, {});

  const allProviders = [...new Set([
    ...Object.keys(byProvider),
  ])];

  async function handleTestWebhook(id: string) {
    setTestingWebhook(id);
    try {
      const r = await validationService.testWebhook(id);
      if (r.ok) toast.success(`Webhook respondeu HTTP ${r.http_status} em ${r.duration_ms}ms`);
      else toast.error(`Falha: ${r.error || `HTTP ${r.http_status}`}`);
    } finally {
      setTestingWebhook(null);
    }
  }

  function handleOpenCreate(provider?: string) {
    setEditingSecret(null);
    setDefaultProvider(provider);
    setAddOpen(true);
  }

  function handleOpenEdit(secret: IntegrationSecret) {
    setEditingSecret(secret);
    setDefaultProvider(secret.provider);
    setAddOpen(true);
  }

  return (
    <div className="space-y-8">
      {/* ── API Keys & Tokens ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-200 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-400" />
              API Keys & Tokens
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Credenciais armazenadas de forma cifrada. Valores nunca são exibidos após o cadastro.
            </p>
          </div>
          <Button
            onClick={() => handleOpenCreate()}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </Button>
        </div>

        {secretsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 bg-zinc-800 rounded-lg" />)}
          </div>
        ) : secrets.length === 0 ? (
          <EmptySecrets onAdd={() => handleOpenCreate()} />
        ) : (
          <div className="space-y-6">
            {allProviders.map((provider) => (
              <div key={provider}>
                <div className="flex items-center gap-2 mb-2">
                  <ProviderIcon provider={provider} className="w-6 h-6" />
                  <span className="text-sm font-medium text-zinc-300">{PROVIDER_LABELS[provider] || provider}</span>
                  <Badge variant="secondary" className="text-xs">{byProvider[provider]?.length || 0}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-xs text-indigo-400 hover:text-indigo-300 h-6 px-2"
                    onClick={() => handleOpenCreate(provider)}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Adicionar
                  </Button>
                </div>
                <div className="space-y-2">
                  {(byProvider[provider] || []).map((s) => (
                    <SecretRow 
                      key={s.id} 
                      secret={s} 
                      onEdit={() => handleOpenEdit(s)} 
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator className="bg-zinc-800" />

      {/* ── Webhooks ───────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-200 flex items-center gap-2">
              <Webhook className="w-4 h-4 text-indigo-400" />
              Webhooks
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Endpoints de entrada e saída para integrar o Wolfgang com outros sistemas.
            </p>
          </div>
        </div>

        {webhooksLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-14 bg-zinc-800 rounded-lg" />)}
          </div>
        ) : webhooks.length === 0 ? (
          <EmptyWebhooks />
        ) : (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400">Direção</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400">Nome</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400">URL</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400">Eventos</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400">Última exec.</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400">Ações</th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map((wh) => {
                  const relTime = wh.last_triggered_at
                    ? formatDistanceToNow(new Date(wh.last_triggered_at), { locale: ptBR, addSuffix: true })
                    : null;
                  return (
                    <tr key={wh.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/20 transition-colors">
                      <td className="px-4 py-3">
                        <Badge variant={wh.direction === 'outbound' ? 'default' : 'secondary'} className="text-xs">
                          {wh.direction === 'outbound' ? 'Saída' : 'Entrada'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-zinc-200">{wh.name}</p>
                        {wh.failure_count > 0 && (
                          <p className="text-xs text-rose-400">{wh.failure_count} falha(s)</p>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <span className="text-xs font-mono text-zinc-500 truncate block">{wh.url}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(wh.event_types || []).slice(0, 3).map((e) => (
                            <span key={e} className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{e}</span>
                          ))}
                          {(wh.event_types?.length || 0) > 3 && (
                            <span className="text-[10px] text-zinc-500">+{(wh.event_types?.length || 0) - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {wh.last_status && (
                            <span className={`text-xs font-mono ${wh.last_status < 300 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {wh.last_status}
                            </span>
                          )}
                          <span className="text-xs text-zinc-600">{relTime ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {wh.direction === 'outbound' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs text-indigo-400 hover:text-indigo-300"
                              disabled={testingWebhook === wh.id}
                              onClick={() => handleTestWebhook(wh.id)}
                            >
                              {testingWebhook === wh.id
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <Globe className="w-3 h-3 mr-1" />}
                              Testar
                            </Button>
                          )}
                          <Switch
                            checked={wh.active}
                            onCheckedChange={(v) => toggleWebhook.mutate({ id: wh.id, active: v })}
                            className="scale-75"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-6 h-6 text-rose-400 hover:text-rose-300"
                            onClick={() => { if (confirm(`Remover webhook "${wh.name}"?`)) delWebhook.mutate(wh.id); }}
                          >
                            <span className="text-xs">✕</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddSecretDialog
        open={addOpen}
        onOpenChange={(val) => {
          setAddOpen(val);
          if (!val) setEditingSecret(null);
        }}
        defaultProvider={defaultProvider}
        editingSecret={editingSecret}
      />
    </div>
  );
}
