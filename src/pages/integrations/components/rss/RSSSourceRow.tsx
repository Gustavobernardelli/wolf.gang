import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, RefreshCw, Pencil, Trash2, MoreVertical, History, Zap } from 'lucide-react';
import { RSSValidationBadge } from './RSSValidationBadge';
import { ValidateRSSResultDialog } from './ValidateRSSResultDialog';
import { useQueryClient } from '@tanstack/react-query';
import { useToggleFeedSource, useDeleteFeedSource } from '@/hooks/useFeedSources';
import { validationService } from '@/services/integrations/validation.service';
import type { FeedSource, FeedValidationLog, ValidationResult } from '@/types/feedSource';

interface Props {
  source: FeedSource;
  lastValidation: FeedValidationLog | null;
  onEdit: (source: FeedSource) => void;
  portalName?: string;
  categoryName?: string | null;
}

function getSourceType(source: FeedSource): string {
  if (source.parser_config?.type) {
    return String(source.parser_config.type).toUpperCase();
  }
  const url = (source.feed_url || '').toLowerCase();
  if (url.includes('atom')) return 'ATOM';
  if (url.includes('rss') || url.endsWith('.xml') || url.includes('/feed') || url.includes('noticia.xml')) {
    return 'RSS';
  }
  if (url.endsWith('.json')) return 'JSON';
  if (url.endsWith('.html') || url.endsWith('.htm') || url.endsWith('/')) {
    return 'HTML';
  }
  return 'RSS';
}

export function RSSSourceRow({ source, lastValidation, onEdit, portalName, categoryName }: Props) {
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [collecting, setCollecting] = useState(false);

  const qc = useQueryClient();
  const toggle = useToggleFeedSource();
  const del = useDeleteFeedSource();

  async function handleValidate() {
    setValidating(true);
    try {
      const r = await validationService.validateFeedById(source.id);
      setValidationResult(r);
      setResultOpen(true);
      qc.invalidateQueries({ queryKey: ['feed-validation-latest-all'] });
      qc.invalidateQueries({ queryKey: ['feed-sources'] });
    } finally {
      setValidating(false);
    }
  }

  async function handleCollect() {
    setCollecting(true);
    try {
      const r = await validationService.collectFromSource(source.id);
      if (r.ok) {
        toast.success(`Coleta concluída! ${r.items_new} novas notícias encontradas.`);
      } else {
        toast.error(`Erro na coleta: ${r.error}`);
      }
    } catch (e) {
      toast.error('Erro ao conectar com o serviço de coleta');
    } finally {
      setCollecting(false);
    }
  }

  const relativeTime = lastValidation
    ? formatDistanceToNow(new Date(lastValidation.created_at), { locale: ptBR, addSuffix: true })
    : null;

  return (
    <>
      <tr className="border-b border-zinc-800/60 hover:bg-zinc-800/20 transition-colors">
        {/* Status */}
        <td className="px-4 py-3">
          <RSSValidationBadge log={lastValidation} source={source} showDetail />
        </td>

        {/* Nome + portal */}
        <td className="px-4 py-3">
          <p className="text-sm font-medium text-zinc-100">{source.name}</p>
          <p className="text-xs text-zinc-500 mt-0.5 uppercase tracking-wide">{portalName || source.portal}</p>
        </td>

        {/* Categoria */}
        <td className="px-4 py-3">
          <span className="text-xs text-zinc-400 capitalize">{categoryName || source.category || '—'}</span>
        </td>

        {/* Tipo */}
        <td className="px-4 py-3">
          <Badge variant="outline" className="text-[10px] font-mono text-zinc-400 border-zinc-700 bg-zinc-800/30">
            {getSourceType(source)}
          </Badge>
        </td>

        {/* URL truncada */}
        <td className="px-4 py-3 max-w-[200px]">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs font-mono text-zinc-400 truncate block cursor-default">
                {source.feed_url}
              </span>
            </TooltipTrigger>
            <TooltipContent className="bg-zinc-800 border-zinc-700 text-zinc-200 max-w-sm break-all">
              {source.feed_url}
            </TooltipContent>
          </Tooltip>
        </td>

        {/* Última validação */}
        <td className="px-4 py-3">
          <span className="text-xs text-zinc-500">{relativeTime ?? '—'}</span>
        </td>

        {/* Itens */}
        <td className="px-4 py-3 text-center">
          <span className="text-sm text-zinc-300">{lastValidation?.items_found ?? '—'}</span>
        </td>

        {/* Ações */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleValidate}
                  disabled={validating}
                  className="w-7 h-7 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
                >
                  {validating
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <RefreshCw className="w-3.5 h-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-zinc-800 border-zinc-700">Validar</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCollect}
                  disabled={collecting || validating}
                  className="w-7 h-7 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                >
                  {collecting
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Zap className="w-3.5 h-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-zinc-800 border-zinc-700">Coletar agora</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onEdit(source)}
                  className="w-7 h-7 text-zinc-400 hover:text-zinc-200"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-zinc-800 border-zinc-700">Editar</TooltipContent>
            </Tooltip>

            <Switch
              checked={source.active}
              onCheckedChange={(v) => toggle.mutate({ id: source.id, active: v })}
              className="scale-75"
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="w-7 h-7 text-zinc-400">
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-zinc-800 border-zinc-700" align="end">
                <DropdownMenuItem className="text-zinc-300 focus:bg-zinc-700 gap-2 cursor-pointer">
                  <History className="w-3.5 h-3.5" /> Ver histórico
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-700" />
                <DropdownMenuItem
                  className="text-rose-400 focus:bg-rose-500/10 focus:text-rose-300 gap-2 cursor-pointer"
                  onClick={() => { if (confirm(`Remover "${source.name}"?`)) del.mutate(source.id); }}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Deletar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </td>
      </tr>

      <ValidateRSSResultDialog
        open={resultOpen}
        onOpenChange={setResultOpen}
        result={validationResult}
        feedName={source.name}
      />
    </>
  );
}
