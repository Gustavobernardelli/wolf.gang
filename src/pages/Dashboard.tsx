import {
  Newspaper,
  CalendarClock,
  Plug,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Rss,
  Camera,
  Globe,
} from 'lucide-react';

const stats = [
  {
    label: 'Notícias Hoje',
    value: '—',
    sub: 'Aguardando feeds',
    icon: Newspaper,
    color: 'from-violet-500 to-violet-700',
    glow: 'shadow-violet-500/20',
  },
  {
    label: 'Artes Geradas',
    value: '—',
    sub: 'Nenhum template ainda',
    icon: Newspaper,
    color: 'from-blue-500 to-blue-700',
    glow: 'shadow-blue-500/20',
  },
  {
    label: 'Agendados',
    value: '—',
    sub: 'Fila vazia',
    icon: CalendarClock,
    color: 'from-cyan-500 to-cyan-700',
    glow: 'shadow-cyan-500/20',
  },
  {
    label: 'Publicações',
    value: '—',
    sub: 'Este mês',
    icon: TrendingUp,
    color: 'from-emerald-500 to-emerald-700',
    glow: 'shadow-emerald-500/20',
  },
];

const channels = [
  { name: 'Instagram', icon: Camera, status: 'disconnected', color: 'text-pink-400' },
  { name: 'Facebook', icon: Globe, status: 'disconnected', color: 'text-blue-400' },
  { name: 'RSS / Blog', icon: Rss, status: 'disconnected', color: 'text-orange-400' },
];

const quickActions = [
  { label: 'Configurar Feed RSS', icon: Rss, to: '/integrations', color: 'bg-violet-500/10 border-violet-500/20 text-violet-400' },
  { label: 'Criar Arte', icon: Newspaper, to: '/mockups', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
  { label: 'Agendar Publicação', icon: CalendarClock, to: '/schedule', color: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' },
  { label: 'Conectar Canal', icon: Plug, to: '/integrations', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
];

export default function Dashboard() {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="px-8 py-8 space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {greeting}! 👋
          </h2>
          <p className="text-sm text-white/40 mt-1">
            Bem-vindo ao News Automation Hub. Configure seus feeds para começar.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/30">
          <Clock className="w-3.5 h-3.5" />
          <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, icon: Icon, color, glow }) => (
          <div
            key={label}
            className="relative rounded-xl border border-white/5 bg-white/[0.03] p-5 overflow-hidden group hover:border-white/10 transition-all duration-200"
          >
            {/* glow bg */}
            <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${color} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />

            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br ${color} shadow-lg ${glow} mb-4`}>
              <Icon className="w-4 h-4 text-white" />
            </div>

            <p className="text-2xl font-bold text-white/90 tabular-nums">{value}</p>
            <p className="text-xs font-medium text-white/60 mt-0.5">{label}</p>
            <p className="text-[11px] text-white/25 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Middle Row ── */}
      <div className="grid grid-cols-3 gap-6">

        {/* Quick Actions */}
        <div className="col-span-1 rounded-xl border border-white/5 bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-4">Ações Rápidas</h3>
          <div className="space-y-2">
            {quickActions.map(({ label, icon: Icon, color }) => (
              <button
                key={label}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all hover:scale-[1.01] active:scale-[0.99] ${color}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
                <ArrowUpRight className="w-3.5 h-3.5 ml-auto opacity-60" />
              </button>
            ))}
          </div>
        </div>

        {/* Canais de publicação */}
        <div className="col-span-1 rounded-xl border border-white/5 bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-4">Canais de Publicação</h3>
          <div className="space-y-3">
            {channels.map(({ name, icon: Icon, status, color }) => (
              <div key={name} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-sm text-white/70">{name}</span>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/30">
                  <AlertCircle className="w-3 h-3" />
                  Não conectado
                </span>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full py-2 rounded-lg border border-dashed border-white/10 text-xs text-white/30 hover:border-white/20 hover:text-white/50 transition-all">
            + Conectar canal
          </button>
        </div>

        {/* Status do sistema */}
        <div className="col-span-1 rounded-xl border border-white/5 bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-4">Status do Sistema</h3>
          <div className="space-y-3">
            {[
              { label: 'Supabase DB', ok: true },
              { label: 'Edge Functions', ok: false },
              { label: 'Coletor RSS', ok: false },
              { label: 'Publicador', ok: false },
            ].map(({ label, ok }) => (
              <div key={label} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-white/50">{label}</span>
                {ok ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Operacional
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-white/25">
                    <span className="w-2 h-2 rounded-full border border-white/20" />
                    Aguardando
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 px-3 py-3 rounded-lg bg-violet-500/5 border border-violet-500/10">
            <p className="text-[11px] text-violet-400/80 leading-relaxed">
              🚀 Projeto vinculado ao Supabase.<br />
              Configure as Edge Functions para ativar a automação.
            </p>
          </div>
        </div>
      </div>

      {/* ── Feed vazio ── */}
      <div className="rounded-xl border border-white/5 bg-white/[0.03]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h3 className="text-sm font-semibold text-white/70">Últimas Notícias Coletadas</h3>
          <span className="text-[11px] text-white/25 px-2.5 py-1 rounded-full bg-white/5">Sem dados</span>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-4">
            <Newspaper className="w-6 h-6 text-white/20" />
          </div>
          <p className="text-sm font-medium text-white/40">Nenhuma notícia coletada ainda</p>
          <p className="text-xs text-white/20 mt-1 max-w-xs">
            Configure uma fonte RSS ou URL para começar a coletar automaticamente
          </p>
          <button className="mt-4 px-4 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400 font-medium hover:bg-violet-500/20 transition-all">
            Adicionar fonte de notícias
          </button>
        </div>
      </div>

    </div>
  );
}
