import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { NewsItem } from '@/types/newsItem';

interface UseNewsItemsOptions {
  portal?: string;
  category?: string;
  status?: string;
  search?: string;
  date?: Date | { from?: Date; to?: Date };
  page?: number;
  pageSize?: number;
}

function getPortalFilterValues(portalName: string): string[] {
  const normalized = portalName.toLowerCase();
  if (normalized.includes('g1')) {
    return ['G1 – Globo', 'g1', 'G1'];
  }
  if (normalized.includes('uol')) {
    return ['UOL', 'uol'];
  }
  if (normalized.includes('folha')) {
    return ['Folha de S.Paulo', 'folha', 'Folha'];
  }
  if (normalized.includes('cnn')) {
    return ['CNN Brasil', 'cnn', 'CNN'];
  }
  if (normalized.includes('bbc')) {
    return ['BBC Brasil', 'bbc', 'BBC'];
  }
  if (normalized.includes('agência brasil') || normalized.includes('agencia brasil') || normalized.includes('ag. brasil')) {
    return ['Agência Brasil', 'agencia_brasil', 'Ag. Brasil', 'Agência Brasil - Geral'];
  }
  if (normalized.includes('metrópoles') || normalized.includes('metropoles')) {
    return ['Metrópoles', 'metropoles'];
  }
  if (normalized.includes('r7')) {
    return ['R7', 'r7'];
  }
  return [portalName];
}

export function useNewsItems(opts: UseNewsItemsOptions = {}) {
  const { portal, category, status, search, date, page = 0, pageSize = 24 } = opts;

  return useQuery({
    queryKey: [
      'news_items',
      portal,
      category,
      status,
      search,
      date instanceof Date
        ? date.toISOString()
        : date
          ? `${date.from?.toISOString()}_${date.to?.toISOString()}`
          : undefined,
      page
    ],
    queryFn: async () => {
      let q = supabase
        .from('news_items')
        .select(`
          *,
          feed_source:feed_sources(name, portal, category)
        `, { count: 'exact' });

      // Build portal filter
      if (portal) {
        let portalValues = [portal];
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(portal);
        if (isUuid) {
          const { data: opt } = await supabase
            .from('feed_source_options')
            .select('name')
            .eq('id', portal)
            .maybeSingle();
          if (opt?.name) {
            portalValues = getPortalFilterValues(opt.name);
          }
        } else {
          portalValues = getPortalFilterValues(portal);
        }
        q = q.in('portal', portalValues);
      }

      if (status) q = q.eq('status', status);
      if (search) q = q.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      
      if (date) {
        if (date instanceof Date) {
          const start = new Date(date);
          start.setHours(0, 0, 0, 0);
          const end = new Date(date);
          end.setHours(23, 59, 59, 999);
          q = q.gte('collected_at', start.toISOString()).lte('collected_at', end.toISOString());
        } else {
          const range = date as { from?: Date; to?: Date };
          if (range.from) {
            const start = new Date(range.from);
            start.setHours(0, 0, 0, 0);
            q = q.gte('collected_at', start.toISOString());
          }
          if (range.to) {
            const end = new Date(range.to);
            end.setHours(23, 59, 59, 999);
            q = q.lte('collected_at', end.toISOString());
          }
        }
      }

      if (category) {
        let categoryValues = [category];
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category);
        if (isUuid) {
          const { data: opt } = await supabase
            .from('feed_source_options')
            .select('name')
            .eq('id', category)
            .maybeSingle();
          if (opt?.name) {
            const normalized = opt.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            categoryValues.push(normalized);
            categoryValues.push(opt.name);
          }
        } else {
          // If a legacy string was passed, also look up its option ID (UUID)
          const { data: opt } = await supabase
            .from('feed_source_options')
            .select('id')
            .ilike('name', category)
            .eq('type', 'category')
            .maybeSingle();
          if (opt?.id) {
            categoryValues.push(opt.id);
          }
        }

        // Rebuild query with the inner join to filter by feed_source.category
        q = supabase
          .from('news_items')
          .select(`
            *,
            feed_source:feed_sources!inner(name, portal, category)
          `, { count: 'exact' })
          .in('feed_source.category', categoryValues);
        
        // Re-apply portal, status, search, and date filters on the new query object
        if (portal) {
          let portalValues = [portal];
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(portal);
          if (isUuid) {
            const { data: opt } = await supabase
              .from('feed_source_options')
              .select('name')
              .eq('id', portal)
              .maybeSingle();
            if (opt?.name) {
              portalValues = getPortalFilterValues(opt.name);
            }
          } else {
            portalValues = getPortalFilterValues(portal);
          }
          q = q.in('portal', portalValues);
        }
        if (status) q = q.eq('status', status);
        if (search) q = q.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
        if (date) {
          if (date instanceof Date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            q = q.gte('collected_at', start.toISOString()).lte('collected_at', end.toISOString());
          } else {
            const range = date as { from?: Date; to?: Date };
            if (range.from) {
              const start = new Date(range.from);
              start.setHours(0, 0, 0, 0);
              q = q.gte('collected_at', start.toISOString());
            }
            if (range.to) {
              const end = new Date(range.to);
              end.setHours(23, 59, 59, 999);
              q = q.lte('collected_at', end.toISOString());
            }
          }
        }
      }

      // Add order and pagination at the end
      q = q
        .order('collected_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      const { data, error, count } = await q;
      if (error) throw error;
      return { items: (data ?? []) as NewsItem[], total: count ?? 0 };
    },
  });
}
