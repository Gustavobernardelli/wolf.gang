import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { CalendarClock, Newspaper, Edit2, Trash2, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EditionModal } from './components/EditionModal';
import { ScheduleCalendarModal } from './components/ScheduleCalendarModal';

interface Edition {
  id: string;
  news_item_id: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  portal: string;
  status: string;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  pending: { label: 'Pendente', class: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
  scheduled: { label: 'Agendado', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  published: { label: 'Publicado', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  postado: { label: 'Postado', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  failed: { label: 'Falha', class: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};

const POST_STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  agendado: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  postado:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  erro:     'bg-rose-500/10 text-rose-400 border-rose-500/20',
  cancelado: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

export function SchedulesPage() {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [postsByEdition, setPostsByEdition] = useState<Record<string, { id: string; channel_id?: string; channel_name: string; destination_label: string; status: string }[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [editingEdition, setEditingEdition] = useState<Edition | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [channelColors, setChannelColors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchEditions();
  }, []);

  async function fetchEditions() {
    setIsLoading(true);
    try {
      // 1. Busca as cores de cada canal cadastrado para aplicar dinamicamente nas tags
      const { data: channelsData } = await supabase
        .from('channels')
        .select('id, name, primary_color');

      const colorsMap: Record<string, string> = {};
      if (channelsData) {
        channelsData.forEach(c => {
          if (c.id) colorsMap[c.id] = c.primary_color || '#7c3aed';
          if (c.name) colorsMap[c.name.toLowerCase()] = c.primary_color || '#7c3aed';
        });
      }
      setChannelColors(colorsMap);

      // 2. Busca edições
      const { data: editionsData, error: editionsError } = await supabase
        .from('editions')
        .select('*')
        .order('created_at', { ascending: false });

      if (editionsError) throw editionsError;
      const fetchedEditions = editionsData || [];

      // 3. Busca agendamentos vinculados
      if (fetchedEditions.length > 0) {
        const editionIds = fetchedEditions.map(e => e.id);
        const { data: postsData, error: postsError } = await supabase
          .from('scheduled_posts')
          .select('id, edition_id, channel_id, channel_name, destination_label, status')
          .in('edition_id', editionIds);

        if (!postsError && postsData) {
          const map: Record<string, typeof postsData> = {};
          for (const post of postsData) {
            if (!map[post.edition_id]) map[post.edition_id] = [];
            map[post.edition_id].push(post);
          }
          setPostsByEdition(map);

          // Sincroniza o status das edições com base no status dos posts agendados
          const editionsWithUpdatedStatus = fetchedEditions.map(edition => {
            const posts = map[edition.id] || [];
            const isAllPosted = posts.length > 0 && posts.every(p => p.status === 'postado');
            if (isAllPosted && edition.status !== 'postado') {
              supabase.from('editions').update({ status: 'postado' }).eq('id', edition.id).then();
              return { ...edition, status: 'postado' };
            } else if (!isAllPosted && edition.status === 'postado') {
              const hasScheduled = posts.some(p => p.status === 'agendado');
              const newStatus = hasScheduled ? 'scheduled' : 'pending';
              supabase.from('editions').update({ status: newStatus }).eq('id', edition.id).then();
              return { ...edition, status: newStatus };
            }
            return edition;
          });
          setEditions(editionsWithUpdatedStatus);
        } else {
          setEditions(fetchedEditions);
        }
      } else {
        setEditions([]);
        setPostsByEdition({});
      }
    } catch (error) {
      console.error('Error fetching editions:', error);
      toast.error('Erro ao carregar os agendamentos.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta edição?')) return;
    
    try {
      const { error } = await supabase
        .from('editions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Edição excluída com sucesso.');
      setEditions(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      console.error('Error deleting edition:', error);
      toast.error('Erro ao excluir a edição.');
    }
  }

  const pendingEditions = editions.filter(e => e.status !== 'postado');
  const postedEditions = editions.filter(e => e.status === 'postado');

  function renderTable(editionsList: Edition[], emptyMessage: string) {
    if (editionsList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 gap-3 bg-[#0c1120] border border-white/5 rounded-xl">
          <p className="text-white/40 text-sm">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="bg-[#0c1120] border border-white/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-xs font-medium text-white/40">
                <th className="px-6 py-4 font-medium">Fonte</th>
                <th className="px-6 py-4 font-medium">Título</th>
                <th className="px-6 py-4 font-medium">Data de Criação</th>
                <th className="px-6 py-4 font-medium w-[180px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {editionsList.map((edition) => (
                <tr key={edition.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 text-[11px] font-medium text-white/60">
                      <Newspaper className="w-3 h-3 opacity-50" />
                      {edition.portal}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-white/80 font-medium line-clamp-1 group-hover:text-violet-300 transition-colors">
                      {edition.title ?? '—'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {postsByEdition[edition.id]?.length ? (
                        postsByEdition[edition.id].map(post => {
                          const color = channelColors[post.channel_id || ''] || channelColors[post.channel_name.toLowerCase()] || '#7c3aed';
                          return (
                            <span
                              key={post.id}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold transition-all"
                              style={{
                                backgroundColor: `${color}15`,
                                color: color,
                                borderColor: `${color}25`
                              }}
                              title={`Status: ${post.status}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                post.status === 'postado'
                                  ? 'bg-emerald-400'
                                  : post.status === 'erro' || post.status === 'cancelado'
                                  ? 'bg-rose-400'
                                  : 'bg-amber-400'
                              }`} />
                              <span>{post.channel_name}</span>
                              <span className="opacity-40">→</span>
                              <span>{post.destination_label}</span>
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-[10px] text-white/30 italic">Nenhum destino salvo</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-white/40">
                    {format(new Date(edition.created_at), "dd/MM/yyyy 'às' HH:mm")}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_MAP[edition.status]?.class || STATUS_MAP.pending.class}`}>
                        {STATUS_MAP[edition.status]?.label || edition.status}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-white/50 hover:text-white hover:bg-white/5 gap-1"
                        onClick={() => setEditingEdition(edition)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Editar
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 text-white/30 hover:text-rose-400 hover:bg-rose-500/10"
                        onClick={() => handleDelete(edition.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Agendamentos</h2>
          <p className="text-sm text-white/40 mt-0.5">
            Gerencie as edições e o agendamento de postagens.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsCalendarOpen(true)}
            variant="outline"
            className="gap-2 bg-[#0c1120] border-white/10 text-white hover:bg-white/5 hover:text-violet-300 transition-colors"
          >
            <CalendarDays className="w-4 h-4 text-violet-400" />
            Calendário
          </Button>
        </div>
      </div>

      {/* Content */}
      <div>
        {isLoading ? (
          <div className="bg-[#0c1120] border border-white/5 rounded-xl p-8 text-center text-white/40">Carregando...</div>
        ) : editions.length === 0 ? (
          <div className="bg-[#0c1120] border border-white/5 rounded-xl flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 flex items-center justify-center">
              <CalendarClock className="w-7 h-7 text-white/20" />
            </div>
            <p className="text-white/40 text-sm">Nenhum agendamento encontrado</p>
            <p className="text-white/25 text-xs text-center max-w-xs">
              Selecione notícias no Feed e clique em Enviar para iniciar um agendamento.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Tabela de Pendentes / Agendados */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <h3 className="text-sm font-medium text-white/80 uppercase tracking-wider">Fila de Postagem</h3>
                <span className="text-xs text-white/40">({pendingEditions.length})</span>
              </div>
              {renderTable(pendingEditions, "Nenhum agendamento pendente encontrado")}
            </div>

            {/* Tabela de Postados */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <h3 className="text-sm font-medium text-white/80 uppercase tracking-wider">Postagens Concluídas</h3>
                <span className="text-xs text-white/40">({postedEditions.length})</span>
              </div>
              {renderTable(postedEditions, "Nenhuma postagem concluída ainda")}
            </div>
          </div>
        )}
      </div>

      <EditionModal 
        edition={editingEdition} 
        open={!!editingEdition} 
        onOpenChange={(open) => {
          if (!open) {
            setEditingEdition(null);
            fetchEditions();
          }
        }} 
      />

      <ScheduleCalendarModal
        editions={editions}
        postsByEdition={postsByEdition}
        open={isCalendarOpen}
        onOpenChange={setIsCalendarOpen}
        onSelectEdition={(edition) => {
          setIsCalendarOpen(false);
          setEditingEdition(edition);
        }}
      />
    </div>
  );
}
