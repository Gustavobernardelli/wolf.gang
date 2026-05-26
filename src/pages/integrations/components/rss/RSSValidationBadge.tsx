import { Badge } from '@/components/ui/badge';
import type { FeedValidationLog, FeedSource } from '@/types/feedSource';

interface Props {
  log?: FeedValidationLog | null;
  source?: FeedSource | null;
  showDetail?: boolean;
}

const CONFIG = {
  success: {
    label: 'Compatível',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20',
    dot: 'bg-emerald-400'
  },
  partial: {
    label: 'Parcial',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20',
    dot: 'bg-amber-400'
  },
  failed: {
    label: 'Falhou',
    className: 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20',
    dot: 'bg-rose-400'
  },
  unchecked: {
    label: 'Não validado',
    className: 'bg-zinc-800/40 text-zinc-400 border-zinc-700/50 hover:bg-zinc-800/60',
    dot: 'bg-zinc-500'
  },
};

export function RSSValidationBadge({ log, source, showDetail = false }: Props) {
  if (!log) {
    let c = CONFIG.unchecked;
    if (source?.source_type) {
      switch (source.source_type) {
        case 'rss':
        case 'json':
        case 'html':
        case 'html_js':
          c = CONFIG.success;
          break;
        case 'bloqueado':
          c = CONFIG.failed;
          break;
        case 'pendente':
          c = CONFIG.unchecked;
          break;
      }
    }

    return (
      <Badge variant="outline" className={`gap-1.5 text-xs ${c.className}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        {c.label}
      </Badge>
    );
  }

  const c = CONFIG[log.status] ?? CONFIG.unchecked;
  return (
    <div className="flex flex-col gap-0.5">
      <Badge variant="outline" className={`gap-1.5 text-xs w-fit ${c.className}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        {c.label}
      </Badge>
      {showDetail && log.items_found > 0 && (
        <span className="text-[11px] text-muted-foreground">{log.items_found} itens</span>
      )}
    </div>
  );
}
