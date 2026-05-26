import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, Newspaper, Sparkles, ExternalLink } from 'lucide-react';

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

interface Props {
  editions: Edition[];
  postsByEdition?: Record<string, { id: string; channel_name: string; destination_label: string; status: string }[]>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectEdition?: (edition: Edition) => void;
}

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  pending: { label: 'Pendente', class: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
  scheduled: { label: 'Agendado', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  published: { label: 'Publicado', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  failed: { label: 'Falha', class: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};

const POST_STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  agendado: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  postado:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  erro:     'bg-rose-500/10 text-rose-400 border-rose-500/20',
  cancelado: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

export function ScheduleCalendarModal({ editions, postsByEdition = {}, open, onOpenChange, onSelectEdition }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Datas que possuem alguma matéria/edição
  const scheduledDates = useMemo(() => {
    return editions.map(e => new Date(e.created_at));
  }, [editions]);

  // Filtrar as matérias para a data selecionada
  const selectedDayEditions = useMemo(() => {
    if (!selectedDate) return [];
    return editions.filter(e => isSameDay(new Date(e.created_at), selectedDate));
  }, [editions, selectedDate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-w-5xl w-full bg-[#0c1120] border-white/10 p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-white/5 bg-[#080b14] flex-shrink-0">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-violet-400" />
            <DialogTitle className="text-lg font-semibold text-white">
              Visão Geral por Calendário
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] min-h-[500px]">
          {/* Coluna Esquerda: Calendário Grande */}
          <div className="p-6 border-r border-white/5 flex flex-col items-center bg-white/[0.005]">
            <p className="text-xs font-medium text-white/50 mb-3 w-full text-left pl-1">
              Selecione uma data para filtrar:
            </p>
            <div className="bg-[#080b14]/50 border border-white/5 rounded-xl p-2 shadow-inner">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                modifiers={{
                  hasEdition: scheduledDates,
                }}
                modifiersClassNames={{
                  hasEdition: 'font-bold relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-violet-400 after:rounded-full',
                }}
                className="rounded-lg border-transparent"
              />
            </div>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-white/40 w-full pl-1">
              <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
              <span>Dias com agendamentos criados</span>
            </div>
          </div>

          {/* Coluna Direita: Matérias Agendadas para o dia escolhido */}
          <div className="p-6 flex flex-col bg-transparent overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 flex-shrink-0">
              <div>
                <h3 className="text-base font-semibold text-white/90 capitalize flex items-center gap-2">
                  <span>{format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}</span>
                  {selectedDayEditions.length > 0 && (
                    <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                      {selectedDayEditions.length} {selectedDayEditions.length === 1 ? 'matéria' : 'matérias'}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-white/40 mt-0.5">
                  Listagem do frontend para as matérias associadas a esta data.
                </p>
              </div>
            </div>

            {/* Listagem com rolagem */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {selectedDayEditions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 py-16 text-center select-none">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <p className="text-sm text-white/40 font-medium">
                    Nenhuma matéria agendada para este dia
                  </p>
                  <p className="text-xs text-white/25 max-w-xs">
                    Escolha outra data no calendário ao lado para visualizar os conteúdos já gerados.
                  </p>
                </div>
              ) : (
                selectedDayEditions.map((edition) => (
                  <div
                    key={edition.id}
                    onClick={() => onSelectEdition?.(edition)}
                    className="p-4 rounded-xl bg-white/[0.015] hover:bg-white/[0.03] border border-white/5 hover:border-violet-500/20 transition-all cursor-pointer group flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 text-[11px] font-medium text-white/60">
                        <Newspaper className="w-3 h-3 opacity-50" />
                        {edition.portal}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_MAP[edition.status]?.class || STATUS_MAP.pending.class}`}>
                        {STATUS_MAP[edition.status]?.label || edition.status}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-white/90 group-hover:text-violet-300 transition-colors line-clamp-2">
                      {edition.title || 'Sem título definido'}
                    </p>

                    {/* Sublinha de canais/destinos configurados */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {postsByEdition[edition.id]?.length ? (
                        postsByEdition[edition.id].map(post => (
                          <span
                            key={post.id}
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-medium ${POST_STATUS_COLORS[post.status] || 'bg-white/5 text-white/60 border-white/10'}`}
                            title={`Status: ${post.status}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
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
                        ))
                      ) : (
                        <span className="text-[10px] text-white/30 italic">Nenhum destino salvo</span>
                      )}
                    </div>

                    {edition.description && (
                      <p className="text-xs text-white/50 line-clamp-2">
                        {edition.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] text-white/30">
                      <span>Criado às {format(new Date(edition.created_at), 'HH:mm')}</span>
                      <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-violet-400">
                        Visualizar edição <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
