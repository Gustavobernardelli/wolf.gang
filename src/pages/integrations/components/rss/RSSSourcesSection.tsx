import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Rss } from 'lucide-react';
import { RSSSourceRow } from './RSSSourceRow';
import { AddRSSSourceDialog } from './AddRSSSourceDialog';
import { useFeedSources } from '@/hooks/useFeedSources';
import { feedSourcesService } from '@/services/integrations/feedSources.service';
import { useQuery } from '@tanstack/react-query';
import type { FeedSource } from '@/types/feedSource';

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
        <Rss className="w-8 h-8 text-indigo-400" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-200 mb-2">Nenhuma fonte RSS cadastrada</h3>
      <p className="text-sm text-zinc-500 max-w-xs mb-6">
        Adicione portais de notícias para o Wolfgang começar a coletar e classificar automaticamente.
      </p>
      <Button onClick={onAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
        <Plus className="w-4 h-4" /> Adicionar Primeira Fonte
      </Button>
    </div>
  );
}

export function RSSSourcesSection() {
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FeedSource | null>(null);

  const { data: sources = [], isLoading } = useFeedSources();

  // Fetch options to resolve portal & category names
  const { data: options = [] } = useQuery({
    queryKey: ['feed-source-options'],
    queryFn: feedSourcesService.listOptions,
  });

  const getPortalName = (portalVal: string) => {
    return options.find((o) => o.type === 'portal' && o.id === portalVal)?.name ?? portalVal;
  };

  const getCategoryName = (catVal: string | null) => {
    if (!catVal) return null;
    return options.find((o) => o.type === 'category' && o.id === catVal)?.name ?? catVal;
  };

  // Fetch last validation for all sources
  const { data: validationMap = {} } = useQuery({
    queryKey: ['feed-validation-latest-all'],
    queryFn: async () => {
      const map: Record<string, Awaited<ReturnType<typeof feedSourcesService.getLastValidation>>> = {};
      await Promise.all(
        sources.map(async (s) => {
          map[s.id] = await feedSourcesService.getLastValidation(s.id);
        })
      );
      return map;
    },
    enabled: sources.length > 0,
  });

  const active = sources.filter((s) => s.active).length;
  const withErrors = sources.filter((s) => s.consecutive_errors > 0).length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-2xl font-bold text-white">{sources.length}</span>
            <span className="text-zinc-500 text-sm ml-2">fontes</span>
          </div>
          <div>
            <span className="text-lg font-semibold text-emerald-400">{active}</span>
            <span className="text-zinc-500 text-sm ml-1">ativas</span>
          </div>
          {withErrors > 0 && (
            <div>
              <span className="text-lg font-semibold text-rose-400">{withErrors}</span>
              <span className="text-zinc-500 text-sm ml-1">com erro</span>
            </div>
          )}
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
        >
          <Plus className="w-4 h-4" /> Adicionar Fonte
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-400 font-medium w-32">Status</TableHead>
              <TableHead className="text-zinc-400 font-medium">Nome / Portal</TableHead>
              <TableHead className="text-zinc-400 font-medium w-28">Categoria</TableHead>
              <TableHead className="text-zinc-400 font-medium w-20">Tipo</TableHead>
              <TableHead className="text-zinc-400 font-medium w-48">URL</TableHead>
              <TableHead className="text-zinc-400 font-medium w-32">Última validação</TableHead>
              <TableHead className="text-zinc-400 font-medium w-16 text-center">Itens</TableHead>
              <TableHead className="text-zinc-400 font-medium w-40">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i} className="border-zinc-800">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full bg-zinc-800" />
                      </td>
                    ))}
                  </TableRow>
                ))
              : sources.length === 0
              ? (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState onAdd={() => setAddOpen(true)} />
                    </td>
                  </tr>
                )
              : sources.map((source) => (
                  <RSSSourceRow
                    key={source.id}
                    source={source}
                    portalName={getPortalName(source.portal)}
                    categoryName={getCategoryName(source.category)}
                    lastValidation={validationMap[source.id] ?? null}
                    onEdit={setEditTarget}
                  />
                ))}
          </TableBody>
        </Table>
      </div>

      <AddRSSSourceDialog open={addOpen} onOpenChange={setAddOpen} />

      {/* Edit dialog */}
      {editTarget && (
        <AddRSSSourceDialog
          open={!!editTarget}
          onOpenChange={(v) => { if (!v) setEditTarget(null); }}
          sourceToEdit={editTarget}
        />
      )}
    </div>
  );
}
