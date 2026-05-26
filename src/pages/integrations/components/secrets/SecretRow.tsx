import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, TestTube, RotateCcw, MoreVertical, Power, Trash2, Pencil } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ProviderIcon } from './ProviderIcon';
import { RotateSecretDialog } from './RotateSecretDialog';
import { useTestSecret, useDeleteSecret, useUpdateSecretMeta } from '@/hooks/useSecrets';
import { KIND_LABELS } from '@/types/secret';
import type { IntegrationSecret } from '@/types/secret';

const VALIDATION_CONFIG = {
  unchecked: { label: 'Não testado', class: 'bg-zinc-700/60 text-zinc-400' },
  valid: { label: 'Válido', class: 'bg-emerald-500/15 text-emerald-400' },
  invalid: { label: 'Inválido', class: 'bg-rose-500/15 text-rose-400' },
  expired: { label: 'Expirado', class: 'bg-amber-500/15 text-amber-400' },
};

interface Props {
  secret: IntegrationSecret;
  onEdit?: () => void;
}

export function SecretRow({ secret, onEdit }: Props) {
  const [rotateOpen, setRotateOpen] = useState(false);
  const test = useTestSecret();
  const del = useDeleteSecret();
  const updateMeta = useUpdateSecretMeta();

  const validConfig = VALIDATION_CONFIG[secret.validation_status] ?? VALIDATION_CONFIG.unchecked;
  const lastValidated = secret.last_validated_at
    ? formatDistanceToNow(new Date(secret.last_validated_at), { locale: ptBR, addSuffix: true })
    : null;

  const selectedModel = (secret.metadata as any)?.selected_model;

  return (
    <div 
      onClick={onEdit}
      className="flex items-center justify-between py-3 px-4 rounded-lg bg-zinc-800/30 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all cursor-pointer group"
    >
      {/* Left: icon + info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <ProviderIcon provider={secret.provider} className="w-9 h-9 flex-shrink-0 group-hover:scale-105 transition-transform" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-zinc-100 truncate">{secret.name}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${validConfig.class}`}>
              {validConfig.label}
            </span>
            {selectedModel && (
              <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded">
                🤖 {selectedModel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <code className="text-xs font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">
              {secret.value_preview}
            </code>
            <span className="text-xs text-zinc-600">{KIND_LABELS[secret.kind] || secret.kind}</span>
            {lastValidated && (
              <span className="text-xs text-zinc-600">testado {lastValidated}</span>
            )}
          </div>
          {secret.validation_message && (
            <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-sm">{secret.validation_message}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="flex items-center gap-1 flex-shrink-0 pl-2"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => test.mutate(secret.id)}
              disabled={test.isPending}
              className="w-7 h-7 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
            >
              {test.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TestTube className="w-3.5 h-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-zinc-800 border-zinc-700">Testar</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setRotateOpen(true)}
              className="w-7 h-7 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-zinc-800 border-zinc-700">Rotacionar valor</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="w-7 h-7 text-zinc-400">
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-zinc-800 border-zinc-700" align="end">
            <DropdownMenuItem
              className="text-zinc-300 focus:bg-zinc-700 gap-2 cursor-pointer"
              onClick={() => updateMeta.mutate({ id: secret.id, active: !secret.active })}
            >
              <Power className="w-3.5 h-3.5" />
              {secret.active ? 'Desativar' : 'Ativar'}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-700" />
            <DropdownMenuItem
              className="text-rose-400 focus:bg-rose-500/10 focus:text-rose-300 gap-2 cursor-pointer"
              onClick={() => {
                if (confirm(`Excluir permanentemente "${secret.name}"?\n\nEsta ação não pode ser desfeita.`)) {
                  del.mutate({ id: secret.id, hard: true });
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5" /> Excluir permanentemente
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <RotateSecretDialog
        open={rotateOpen}
        onOpenChange={setRotateOpen}
        secret={secret}
      />
    </div>
  );
}
