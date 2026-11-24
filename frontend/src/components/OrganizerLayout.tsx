import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { ChevronDown, ChevronsUpDown, LogOut } from 'lucide-react';
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

interface MenuItem { path: string; label: string; match?: (p: string) => boolean; }

const menuItems: MenuItem[] = [
  { path: '/dashboard', label: 'Painel', match: (p) => p === '/dashboard' },
  { path: '/dashboard/times', label: 'Times', match: (p) => p.startsWith('/dashboard/times') || p.startsWith('/dashboard/jogadores') },
  { path: '/dashboard/rodadas', label: 'Rodadas', match: (p) => p.startsWith('/dashboard/rodadas') || p.startsWith('/dashboard/resultado') },
  { path: '/dashboard/sumula', label: 'Súmula', match: (p) => p.startsWith('/dashboard/sumula') },
  { path: '/dashboard/co-adms', label: 'Co-adms', match: (p) => p.startsWith('/dashboard/co-adms') },
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

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-[1320px] mx-auto px-6 md:px-10">
        {/* Masthead */}
        <header className="rule-double pt-6 pb-2.5 grid grid-cols-[1fr_auto_1fr] items-end gap-4">
          <div className="flex items-end">
            <Logo size="md" />
          </div>
          <button onClick={() => navigate('/dashboard')} className="masthead-title text-[clamp(32px,6vw,60px)] text-center" title="Ir pro painel">
            O&nbsp;Organizador
          </button>
          <div className="font-scoreboard text-[10px] uppercase tracking-[0.22em] text-muted-foreground leading-[1.5] text-right">
            {hoje}<br />{usuario?.nome ?? 'organizador'}
          </div>
        </header>

        {/* Nav bar */}
        <nav className="border-b border-foreground flex items-center justify-between gap-4 overflow-x-auto">
          <div className="flex items-center gap-5 md:gap-7">
            {menuItems.map((item) => {
              const active = item.match ? item.match(location.pathname) : location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`font-scoreboard text-[11px] uppercase tracking-[0.14em] py-3.5 whitespace-nowrap border-b-2 -mb-px transition-colors ${
                    active ? 'border-brand text-foreground font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 shrink-0 pl-4">
            {ativo && (
              <DropdownMenu>
                <DropdownMenuTrigger className="group flex items-center gap-2 max-w-[220px] border border-border hover:border-foreground px-2.5 h-8 transition-colors">
                  <span className="font-scoreboard text-[9px] uppercase tracking-[0.16em] text-muted-foreground leading-none">Ativo</span>
                  <span className="w-px h-3.5 bg-border shrink-0" />
                  <span className="font-display text-sm truncate leading-none">{ativo.nome}</span>
                  <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
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
            )}
            <DropdownMenu>
              <DropdownMenuTrigger className="group flex items-center gap-2 h-8 pl-1 pr-2 border border-border hover:border-foreground transition-colors">
                <span className="h-6 w-6 bg-primary text-primary-foreground flex items-center justify-center font-scoreboard text-[10px]">
                  {iniciais(usuario?.nome ?? 'U')}
                </span>
                <span className="hidden sm:block font-scoreboard text-[10px] uppercase tracking-[0.12em] text-muted-foreground group-hover:text-foreground">Conta</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm truncate">{usuario?.nome ?? 'Organizador'}</p>
                  <p className="text-xs text-muted-foreground truncate">{usuario?.email ?? ''}</p>
                </div>
                <DropdownMenuItem onClick={handleSair} className="border-t mt-1 pt-1.5">
                  <LogOut className="h-4 w-4" /> Sair da conta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
