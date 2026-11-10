import React from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Trophy, Users, UserCircle, LogOut, ChevronRight, Calendar } from 'lucide-react';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../lib/useAuth';
import { campeonatoAtivo } from '../lib/session';

interface OrganizerLayoutProps {
  children: React.ReactNode;
  championshipName?: string;
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase() || 'U';
}

const menuItems = [
  { path: '/dashboard', label: 'Meus Campeonatos', icon: Trophy },
  { path: '/dashboard/times', label: 'Times', icon: Users },
  { path: '/dashboard/jogadores', label: 'Jogadores', icon: UserCircle },
  { path: '/dashboard/rodadas', label: 'Rodadas e Partidas', icon: Calendar },
];

export function OrganizerLayout({ children, championshipName }: OrganizerLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario, sair } = useAuth();
  const ativo = championshipName ?? campeonatoAtivo.get()?.nome;

  function handleSair() {
    sair();
    navigate('/');
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <aside className="w-64 bg-card border-r border-border flex flex-col shrink-0">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity">
            <Logo size="md" />
          </button>
          <ThemeToggle />
        </div>

        {ativo && (
          <div className="px-4 py-3 border-b border-border bg-primary/10">
            <p className="text-xs text-muted-foreground mb-0.5">Campeonato ativo</p>
            <p className="text-sm text-primary truncate font-medium">{ativo}</p>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground font-normal hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && <ChevronRight className="w-3 h-3 text-primary" />}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs text-primary font-semibold">{iniciais(usuario?.nome ?? 'Usuário')}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate font-medium">{usuario?.nome ?? 'Organizador'}</p>
              <p className="text-xs text-muted-foreground truncate">{usuario?.email ?? ''}</p>
            </div>
          </div>
          <button
            onClick={handleSair}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
