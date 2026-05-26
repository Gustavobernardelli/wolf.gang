import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Calendar, User, Tag, ExternalLink, Globe, Clock } from 'lucide-react';
import type { NewsItem } from '@/types/newsItem';
import { useQuery } from '@tanstack/react-query';
import { feedSourcesService } from '@/services/integrations/feedSources.service';

const PORTAL_LABELS: Record<string, string> = {
  g1: 'G1', uol: 'UOL', folha: 'Folha', cnn: 'CNN Brasil',
  bbc: 'BBC Brasil', agencia_brasil: 'Ag. Brasil', metropoles: 'Metrópoles', r7: 'R7',
};

const CATEGORY_COLORS: Record<string, string> = {
  economia: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  tecnologia: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  politica: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  esportes: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  saude: 'bg-teal-500/15 text-teal-400 border-teal-500/20',
  internacional: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  geral: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
};

interface Props {
  item: NewsItem | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function NewsDetailModal({ item, open, onOpenChange }: Props) {
  const { data: options = [] } = useQuery({
    queryKey: ['feed-source-options'],
    queryFn: feedSourcesService.listOptions,
  });

  if (!item) return null;

  const rawCategory = item.feed_source?.category ?? 'geral';
  const matchedOption = options.find((o) => o.type === 'category' && o.id === rawCategory);
  const categoryName = matchedOption?.name ?? rawCategory;

  const normalizedCategory = matchedOption 
    ? matchedOption.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    : rawCategory.toLowerCase();

  const catColor = CATEGORY_COLORS[normalizedCategory] ?? CATEGORY_COLORS.geral;

  const matchedPortalOption = options.find((o) => o.type === 'portal' && o.id === item.portal);
  const portalName = matchedPortalOption?.name ?? (PORTAL_LABELS[item.portal] ?? item.portal);

  const plainDescription = item.description
    ? item.description.replace(/<[^>]*>/g, '').trim()
    : null;

  const pubDate = item.published_at
    ? new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long',
        year: 'numeric', hour: '2-digit', minute: '2-digit',
      }).format(new Date(item.published_at))
    : null;

  const collectedAt = item.collected_at
    ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(item.collected_at))
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0c1120] border-white/10 p-0">
        {/* Image */}
        {item.image_url && (
          <div className="relative aspect-video w-full overflow-hidden rounded-t-lg">
            <img
              src={item.image_url}
              alt={item.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c1120] via-transparent to-transparent" />
          </div>
        )}

        <div className="p-6 space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${catColor}`}>
              {categoryName.charAt(0).toUpperCase() + categoryName.slice(1)}
            </span>
            <Badge variant="outline" className="text-white/50 border-white/10 text-xs">
              <Globe className="w-3 h-3 mr-1" />{portalName}
            </Badge>
            {item.feed_source?.name && (
              <Badge variant="outline" className="text-white/40 border-white/10 text-xs">
                {item.feed_source.name}
              </Badge>
            )}
          </div>

          {/* Title */}
          <h2 className="text-lg font-bold text-white leading-snug">{item.title}</h2>
          {item.subtitle && (
            <p className="text-sm text-white/60 leading-relaxed">{item.subtitle}</p>
          )}

          {/* Meta */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {pubDate && (
              <span className="flex items-center gap-1.5 text-xs text-white/40">
                <Calendar className="w-3.5 h-3.5 text-violet-400" />
                {pubDate}
              </span>
            )}
            {item.author && (
              <span className="flex items-center gap-1.5 text-xs text-white/40">
                <User className="w-3.5 h-3.5 text-violet-400" />
                {item.author}
              </span>
            )}
            {collectedAt && (
              <span className="flex items-center gap-1.5 text-xs text-white/30">
                <Clock className="w-3.5 h-3.5" />
                Coletado em {collectedAt}
              </span>
            )}
          </div>

          {/* Categories */}
          {item.categories && item.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.categories.map((c) => (
                <span key={c} className="flex items-center gap-1 text-xs bg-zinc-800 text-white/50 px-2 py-0.5 rounded-full border border-white/5">
                  <Tag className="w-3 h-3" />{c}
                </span>
              ))}
            </div>
          )}

          <Separator className="bg-white/5" />

          {/* Description */}
          {plainDescription && (
            <div className="space-y-1">
              <p className="text-xs text-white/30 uppercase tracking-wider font-medium">Descrição</p>
              <p className="text-sm text-white/70 leading-relaxed">{plainDescription}</p>
            </div>
          )}

          {/* Content */}
          {item.content && item.content !== plainDescription && (
            <div className="space-y-1">
              <p className="text-xs text-white/30 uppercase tracking-wider font-medium">Conteúdo</p>
              <p className="text-sm text-white/70 leading-relaxed">{item.content}</p>
            </div>
          )}

          <Separator className="bg-white/5" />

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              asChild
              className="bg-violet-600 hover:bg-violet-700 text-white text-sm gap-2"
            >
              <a href={item.link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
                Abrir notícia original
              </a>
            </Button>
            {item.relevance_score !== null && (
              <span className="text-xs text-white/30">
                Score de relevância: <span className="text-white/50 font-mono">{item.relevance_score}</span>
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
