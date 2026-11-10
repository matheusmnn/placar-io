import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { LayoutDashboard, Trophy, Users, UserCircle, Calendar, ClipboardList, ChevronsUpDown, LogOut } from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '../lib/useAuth';
import { campeonatoAtivo } from '../lib/session';
import { api, Campeonato } from '../lib/api';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from './ui/dropdown-menu';

interface OrganizerLayoutProps { children: React.ReactNode; }

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase() || 'U';
}

interface MenuItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match?: (p: string) => boolean;
}

const menuItems: MenuItem[] = [
  { path: '/dashboard', label: 'Painel', icon: LayoutDashboard, match: (p) => p === '/dashboard' },
  { path: '/dashboard/novo', label: 'Novo campeonato', icon: Trophy, match: (p) => p.startsWith('/dashboard/novo') },
  { path: '/dashboard/times', label: 'Times', icon: Users, match: (p) => p.startsWith('/dashboard/times') },
  { path: '/dashboard/jogadores', label: 'Jogadores', icon: UserCircle, match: (p) => p.startsWith('/dashboard/jogadores') },
  { path: '/dashboard/rodadas', label: 'Rodadas', icon: Calendar, match: (p) => p.startsWith('/dashboard/rodadas') || p.startsWith('/dashboard/resultado') },
  { path: '/dashboard/sumula', label: 'Configurar súmula', icon: ClipboardList, match: (p) => p.startsWith('/dashboard/sumula') },
];

export function OrganizerLayout({ children }: OrganizerLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario, sair } = useAuth();
  const ativo = campeonatoAtivo.get();
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([]);

  useEffect(() => {
    api.listarCampeonatos().then((r) => setCampeonatos(r.campeonatos)).catch(() => {});
  }, []);

  function trocarCampeonato(c: Campeonato) {
    campeonatoAtivo.set({ id: c.id, nome: c.nome });
    navigate('/dashboard/rodadas');
  }

  function handleSair() { sair(); navigate('/'); }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="panel-dark w-64 shrink-0 flex flex-col sticky top-0 h-screen">
        <div className="px-5 pt-6 pb-8">
          <Logo size="md" tone="light" />
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.match ? item.match(location.pathname) : location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 h-9 rounded-md text-sm transition-colors relative ${
                  isActive
                    ? 'bg-sidebar-accent text-background'
                    : 'text-background/70 hover:bg-background/5 hover:text-background'
                }`}
              >
                {isActive && <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-brand rounded-full" />}
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {ativo && (
          <div className="mx-4 mb-3 border-t border-background/10 pt-4">
            <p className="text-xs text-background/50">Campeonato ativo</p>
            <DropdownMenu>
              <DropdownMenuTrigger className="w-full flex items-center gap-1.5 text-left text-sm text-background hover:text-background mt-0.5 group">
                <span className="truncate flex-1">{ativo.nome}</span>
                <ChevronsUpDown className="h-3.5 w-3.5 text-background/50 group-hover:text-background shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {campeonatos.filter((c) => c.id !== ativo.id).map((c) => (
                  <DropdownMenuItem key={c.id} onClick={() => trocarCampeonato(c)}>
                    <span className="truncate">{c.nome}</span>
                  </DropdownMenuItem>
                ))}
                {campeonatos.filter((c) => c.id !== ativo.id).length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum outro campeonato.</div>
                )}
                <DropdownMenuItem onClick={() => navigate('/dashboard')} className="border-t mt-1 pt-1.5">
                  Ver todos os campeonatos
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <div className="p-4 border-t border-sidebar-border space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-background/10 flex items-center justify-center text-xs text-background">
              {iniciais(usuario?.nome ?? 'U')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-background truncate">{usuario?.nome ?? 'Organizador'}</p>
              <p className="text-xs text-background/50 truncate">{usuario?.email ?? ''}</p>
            </div>
          </div>
          <button
            onClick={handleSair}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-md border border-background/20 text-sm text-background hover:bg-background/10 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sair da conta
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
