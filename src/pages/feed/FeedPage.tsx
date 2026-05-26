import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Filter, RefreshCw, Newspaper, X, CheckSquare, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNewsItems } from '@/hooks/useNewsItems';
import { NewsCard } from './components/NewsCard';
import { NewsDetailModal } from './components/NewsDetailModal';
import { DatePicker } from '@/components/ui/date-picker';
import type { NewsItem } from '@/types/newsItem';
import type { DateRange } from 'react-day-picker';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { feedSourcesService } from '@/services/integrations/feedSources.service';
import { useFeedSources } from '@/hooks/useFeedSources';

function CardSkeleton() {
  return (
    <div className="flex flex-col bg-[#0c1120] border border-white/5 rounded-xl overflow-hidden">
      <Skeleton className="aspect-video w-full bg-zinc-800" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-full bg-zinc-800" />
        <Skeleton className="h-4 w-3/4 bg-zinc-800" />
        <Skeleton className="h-3 w-1/2 bg-zinc-800 mt-3" />
      </div>
    </div>
  );
}

export function FeedPage() {
  const [search, setSearch] = useState('');
  const [portal, setPortal] = useState('all');
  const [category, setCategory] = useState('all');
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedNewsItems, setSelectedNewsItems] = useState<NewsItem[]>([]);
  const [isSending, setIsSending] = useState(false);
  const navigate = useNavigate();

  // Fetch portals and categories options dynamically from Supabase
  const { data: options = [] } = useQuery({
    queryKey: ['feed-source-options'],
    queryFn: feedSourcesService.listOptions,
  });

  // Fetch feed sources to filter only active portals
  const { data: sources = [] } = useFeedSources();

  // Helper to resolve portal value (UUID or legacy) to the corresponding option name
  const resolvePortalName = (portalVal: string, opts: typeof options) => {
    // Try to find by UUID
    const foundByUuid = opts.find((o) => o.type === 'portal' && o.id === portalVal);
    if (foundByUuid) return foundByUuid.name;

    // Try to find by direct name match (case-insensitive)
    const foundByName = opts.find(
      (o) => o.type === 'portal' && o.name.toLowerCase() === portalVal.toLowerCase()
    );
    if (foundByName) return foundByName.name;

    // Legacy/fuzzy mapping
    const normalizedVal = portalVal.toLowerCase();
    if (normalizedVal.includes('g1')) {
      const g1Opt = opts.find((o) => o.type === 'portal' && o.name.toLowerCase().includes('g1'));
      if (g1Opt) return g1Opt.name;
    }
    if (normalizedVal.includes('uol')) {
      const uolOpt = opts.find((o) => o.type === 'portal' && o.name.toLowerCase().includes('uol'));
      if (uolOpt) return uolOpt.name;
    }
    if (normalizedVal.includes('folha')) {
      const folhaOpt = opts.find((o) => o.type === 'portal' && o.name.toLowerCase().includes('folha'));
      if (folhaOpt) return folhaOpt.name;
    }
    if (normalizedVal.includes('cnn')) {
      const cnnOpt = opts.find((o) => o.type === 'portal' && o.name.toLowerCase().includes('cnn'));
      if (cnnOpt) return cnnOpt.name;
    }
    if (normalizedVal.includes('bbc')) {
      const bbcOpt = opts.find((o) => o.type === 'portal' && o.name.toLowerCase().includes('bbc'));
      if (bbcOpt) return bbcOpt.name;
    }
    if (normalizedVal.includes('agencia') || normalizedVal.includes('agência')) {
      const agOpt = opts.find((o) => o.type === 'portal' && o.name.toLowerCase().includes('agencia'));
      if (agOpt) return agOpt.name;
    }
    if (normalizedVal.includes('metropole')) {
      const metOpt = opts.find((o) => o.type === 'portal' && o.name.toLowerCase().includes('metropole'));
      if (metOpt) return metOpt.name;
    }
    if (normalizedVal.includes('r7')) {
      const r7Opt = opts.find((o) => o.type === 'portal' && o.name.toLowerCase().includes('r7'));
      if (r7Opt) return r7Opt.name;
    }

    // Fallback fuzzy match
    const fuzzyOpt = opts.find(
      (o) =>
        o.type === 'portal' &&
        (o.name.toLowerCase().includes(normalizedVal) ||
          normalizedVal.includes(o.name.toLowerCase()))
    );
    if (fuzzyOpt) return fuzzyOpt.name;

    return portalVal;
  };

  const activePortalNames = new Set(
    sources
      .filter((s) => s.active)
      .map((s) => resolvePortalName(s.portal, options))
  );

  const portals = [
    { value: 'all', label: 'Todos os portais' },
    ...options
      .filter((o) => o.type === 'portal' && activePortalNames.has(o.name))
      .map((o) => ({ value: o.name, label: o.name })),
  ];

  const categories = [
    { value: 'all', label: 'Todas as categorias' },
    ...options
      .filter((o) => o.type === 'category')
      .map((o) => ({ value: o.id, label: o.name })),
  ];

  const { data, isLoading, refetch, isFetching } = useNewsItems({
    portal: portal === 'all' ? undefined : portal,
    category: category === 'all' ? undefined : category,
    search: debouncedSearch || undefined,
    date,
    pageSize: 1000,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  function handleSearchChange(v: string) {
    setSearch(v);
    const timeoutId = (handleSearchChange as any)._t;
    if (timeoutId) clearTimeout(timeoutId);
    (handleSearchChange as any)._t = setTimeout(() => setDebouncedSearch(v), 400);
  }

  const resetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setPortal('all');
    setCategory('all');
    setDate({ from: new Date(), to: new Date() });
  };

  const handleSendSelected = async () => {
    if (selectedNewsItems.length === 0) return;
    setIsSending(true);
    try {
      toast.info(`Enviando ${selectedNewsItems.length} notícia(s) para agendamento...`);

      const editions = selectedNewsItems.map((item) => {
        const originalDesc = item.description?.replace(/<[^>]*>/g, '').trim() || '';
        return {
          news_item_id: item.id,
          portal:       item.portal,
          status:       'pending',
          title:        item.title || '',
          subtitle:     null,
          description:  originalDesc,
        };
      });

      const { error } = await supabase.from('editions').insert(editions);
      if (error) throw error;

      toast.success(`${selectedNewsItems.length} notícia(s) enviada(s) para agendamento!`);
      setSelectionMode(false);
      setSelectedNewsItems([]);
      navigate('/schedule');
    } catch (error: any) {
      console.error('Error sending editions:', error);
      toast.error('Erro ao enviar as notícias selecionadas.');
    } finally {
      setIsSending(false);
    }
  };

  const toggleSelection = (item: NewsItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedNewsItems(prev => {
      const exists = prev.some(n => n.id === item.id);
      if (exists) return prev.filter(n => n.id !== item.id);
      return [...prev, item];
    });
  };

  const hasFilters = search || portal !== 'all' || category !== 'all' || date;

  const portalTarget = document.getElementById('header-actions-portal');
  const actionButtons = (
    <div className="flex items-center gap-2">
      {selectionMode ? (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectionMode(false);
              setSelectedNewsItems([]);
            }}
            disabled={isSending}
            className="text-white/50 hover:text-white hover:bg-white/5"
          >
            Cancelar
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={isSending || selectedNewsItems.length === 0}
            onClick={handleSendSelected}
            className={`gap-2 ${selectedNewsItems.length > 0 ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-900/50 text-emerald-500/50'}`}
          >
            <Send className="w-3.5 h-3.5" />
            {isSending ? 'Enviando...' : `Enviar (${selectedNewsItems.length})`}
          </Button>
        </>
      ) : (
        <Button
          variant="default"
          size="sm"
          onClick={() => setSelectionMode(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
        >
          <CheckSquare className="w-3.5 h-3.5" />
          Selecionar
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => refetch()}
        disabled={isFetching}
        className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border-none gap-2"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
        Atualizar
      </Button>
    </div>
  );

  return (
    <div className="p-8 space-y-6">
      {portalTarget && createPortal(actionButtons, portalTarget)}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Feed de Notícias</h2>
          <p className="text-sm text-white/40 mt-0.5">
            {isLoading ? 'Carregando…' : `${total.toLocaleString('pt-BR')} notícias coletadas`}
          </p>
        </div>
        {!portalTarget && actionButtons}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por título ou descrição…"
            className="pl-9 bg-zinc-900 border-white/10 text-white placeholder:text-white/30 focus-visible:border-violet-500/50"
          />
        </div>
        
        <DatePicker 
          date={date} 
          setDate={setDate} 
          placeholder="Filtrar por data"
          mode="range"
        />

        <Select value={portal} onValueChange={setPortal}>
          <SelectTrigger className="w-48 bg-zinc-900 border-white/10 text-white/70">
            <Filter className="w-3.5 h-3.5 mr-2 text-white/30" />
            <SelectValue placeholder="Portal" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-white/10">
            {portals.map((p) => (
              <SelectItem key={p.value} value={p.value} className="text-white/70 focus:bg-zinc-800">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-48 bg-zinc-900 border-white/10 text-white/70">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-white/10">
            {categories.map((c) => (
              <SelectItem key={c.value} value={c.value} className="text-white/70 focus:bg-zinc-800">
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 flex items-center justify-center">
            <Newspaper className="w-7 h-7 text-white/20" />
          </div>
          <p className="text-white/40 text-sm">Nenhuma notícia encontrada</p>
          <p className="text-white/25 text-xs text-center max-w-xs">
            As notícias aparecerão aqui após o coletor de RSS ser executado.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <NewsCard 
              key={item.id} 
              item={item} 
              onClick={() => setSelected(item)} 
              selectionMode={selectionMode}
              isSelected={selectedNewsItems.some(n => n.id === item.id)}
              onToggleSelect={(e) => toggleSelection(item, e)}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      <NewsDetailModal
        item={selected}
        open={!!selected}
        onOpenChange={(v) => { if (!v) setSelected(null); }}
      />
    </div>
  );
}
