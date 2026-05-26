import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Newspaper,
  CalendarClock,
  Plug,
  Settings,
  Zap,
  ChevronRight,
  Layers,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/feed', icon: Newspaper, label: 'Feed de Notícias' },
  { to: '/channels', icon: Layers, label: 'Canais' },
  { to: '/schedule', icon: CalendarClock, label: 'Agendamentos' },
  { to: '/integrations', icon: Plug, label: 'Integrações' },
];

export default function AppLayout() {
  const location = useLocation();

  const getPageTitle = () => {
    const item = navItems.find((n) => location.pathname.startsWith(n.to));
    return item?.label ?? 'Dashboard';
  };

  return (
    <div className="flex h-screen bg-[#080b14] text-white overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-white/5 bg-[#0c1120]">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-white">Wolfgang</p>
            <p className="text-[10px] text-white/40 tracking-wider uppercase">News Hub</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-colors ${
                      isActive ? 'text-violet-400' : 'text-white/40 group-hover:text-white/60'
                    }`}
                  />
                  <span className="flex-1">{label}</span>
                  {isActive && (
                    <ChevronRight className="w-3 h-3 text-violet-400/60" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-white/5">
          <NavLink
            to="/settings"
            className="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/40 hover:text-white/70 hover:bg-white/5 transition-all border border-transparent"
          >
            <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300" />
            <span>Configurações</span>
          </NavLink>
          <div className="mt-3 mx-1 px-3 py-3 rounded-lg bg-white/3 border border-white/5">
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Projeto Supabase</p>
            <p className="text-[11px] text-white/50 font-mono truncate">atkstqfnwdbwhplukkiq</p>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-[#080b14]/80 backdrop-blur-sm min-h-[53px]">
          <h1 className="text-sm font-semibold text-white/70">{getPageTitle()}</h1>
          <div id="header-actions-portal" className="flex items-center gap-2"></div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
