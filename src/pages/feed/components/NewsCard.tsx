import { Calendar, User, Tag, ExternalLink } from 'lucide-react';
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
  item: NewsItem;
  onClick: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (e: React.MouseEvent) => void;
}

export function NewsCard({ item, onClick, selectionMode, isSelected, onToggleSelect }: Props) {
  const { data: options = [] } = useQuery({
    queryKey: ['feed-source-options'],
    queryFn: feedSourcesService.listOptions,
  });

  const rawCategory = item.feed_source?.category ?? 'geral';
  const matchedOption = options.find((o) => o.type === 'category' && o.id === rawCategory);
  const categoryName = matchedOption?.name ?? rawCategory;

  const normalizedCategory = matchedOption 
    ? matchedOption.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    : rawCategory.toLowerCase();

  const catColor = CATEGORY_COLORS[normalizedCategory] ?? CATEGORY_COLORS.geral;

  const matchedPortalOption = options.find(
    (o) => o.type === 'portal' && (o.id === item.portal || o.id === item.feed_source?.portal || o.name === item.portal)
  );
  const portalName = matchedPortalOption?.name ?? (PORTAL_LABELS[item.portal] ?? item.portal);

  const plainDescription = item.description
    ? item.description.replace(/<[^>]*>/g, '').trim().slice(0, 120)
    : null;

  const pubDate = item.published_at
    ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(item.published_at))
    : null;

  return (
    <article
      onClick={selectionMode ? onToggleSelect : onClick}
      className={`group flex flex-col bg-[#0c1120] border rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10'
          : 'border-white/5 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5'
      }`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-zinc-900 overflow-hidden flex-shrink-0">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl font-bold text-white/5">{portalName}</span>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${catColor}`}>
            {categoryName.charAt(0).toUpperCase() + categoryName.slice(1)}
          </span>
        </div>
        
        {selectionMode ? (
          <div className="absolute top-2 right-2">
            <button
              onClick={onToggleSelect}
              className={`w-6 h-6 rounded-md flex items-center justify-center border transition-colors ${
                isSelected
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'bg-black/60 border-white/20 text-transparent hover:border-white/40'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          </div>
        ) : (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-0.5 rounded-full bg-black/60 text-[10px] text-white/70 font-medium backdrop-blur-sm">
              {portalName}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <div className="flex items-center">
          <span className="inline-flex px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[10px] text-white/50 font-medium">
            {portalName}
          </span>
        </div>
        <h3 className="text-sm font-semibold text-white leading-snug line-clamp-3 group-hover:text-violet-300 transition-colors">
          {item.title}
        </h3>

        {plainDescription && (
          <p className="text-xs text-white/40 leading-relaxed line-clamp-2">
            {plainDescription}…
          </p>
        )}

        <div className="mt-auto pt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/5">
          {pubDate && (
            <span className="flex items-center gap-1 text-[11px] text-white/35">
              <Calendar className="w-3.5 h-3.5" /> {pubDate}
            </span>
          )}
          {item.author && (
            <span className="flex items-center gap-1 text-[11px] text-white/35 truncate max-w-[120px]">
              <User className="w-3.5 h-3.5 flex-shrink-0" /> {item.author}
            </span>
          )}
          {item.categories && item.categories.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-white/35">
              <Tag className="w-3.5 h-3.5" /> {item.categories[0]}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
