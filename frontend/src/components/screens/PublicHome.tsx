import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, ChevronDown, LayoutDashboard, Loader2, LogOut } from 'lucide-react';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Logo } from '../Logo';
import { TeamShield } from '../TeamShield';
import { api, CampeonatoResumoPublico } from '../../lib/api';
import { useAuth } from '../../lib/useAuth';

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase() || 'U';
}

function semAcento(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export function PublicHome() {
  const navigate = useNavigate();
  const { isLogged, usuario, sair } = useAuth();
  const [campeonatos, setCampeonatos] = useState<CampeonatoResumoPublico[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    api.publicoListar()
      .then(setCampeonatos)
      .catch(() => setCampeonatos([]))
      .finally(() => setLoading(false));
  }, []);

  const filtrados = useMemo(
    () => campeonatos.filter((c) => semAcento(c.nome).includes(semAcento(busca.trim()))),
    [campeonatos, busca],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Logo size="md" />
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#como-funciona" className="hover:text-foreground">Como funciona</a>
          <a href="#campeonatos" className="hover:text-foreground">Ver campeonatos</a>
          <a href="#precos" className="hover:text-foreground">Preços</a>
        </nav>
        <div className="flex items-center gap-2">
          {isLogged ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-foreground/15 hover:border-foreground/40 pl-1 pr-2.5 py-1 transition-colors">
                  <span className="h-7 w-7 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-medium">
                    {iniciais(usuario?.nome ?? 'U')}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm truncate">{usuario?.nome ?? 'Organizador'}</p>
                  <p className="text-xs text-muted-foreground truncate">{usuario?.email ?? ''}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                  <LayoutDashboard className="h-4 w-4" /> Meu painel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { sair(); navigate('/'); }} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => navigate('/login')}>Entrar</Button>
              <Button size="sm" onClick={() => navigate('/cadastro')}>Criar conta</Button>
            </>
          )}
        </div>
      </header>

      {/* HERO: texto à esquerda, preview de súmula (produto) à direita */}
      <section className="max-w-6xl mx-auto px-6 pt-12 pb-20 lg:pt-20 lg:pb-28 grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-16 items-center">
        <div>
          <h1 className="font-display text-5xl lg:text-6xl leading-[1.05]">
            Um campeonato
            <br />
            com súmula,
            <br />
            tabela e grupo
            <br />
            no mesmo lugar.
          </h1>
          <p className="mt-6 text-lg text-foreground/70 max-w-md leading-relaxed">
            Monta a chave, abre a súmula no celular no dia do jogo, fecha e manda o link pro grupo do WhatsApp ver a classificação.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Button size="lg" onClick={() => navigate('/cadastro')}>Criar meu campeonato</Button>
            <a href="#campeonatos" className="text-sm font-medium inline-flex items-center gap-1 hover:text-brand">
              Ver exemplo <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Grátis até 8 times · Sem cadastro de cartão · Páginas públicas abertas
          </p>
        </div>

        {/* Produto como momento: classificação em folha de súmula */}
        <SumulaPreview />
      </section>

      {/* SEÇÃO EXPLICATIVA: duas faixas com preview real do produto */}
      <section id="como-funciona" className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-20 lg:py-24 grid lg:grid-cols-2 gap-x-16 gap-y-20">
          <div className="lg:py-10">
            <p className="text-sm text-brand font-medium mb-3">Súmula padrão CBF</p>
            <h2 className="font-display text-3xl lg:text-4xl leading-[1.1] mb-5">
              A mesma súmula que você preenche em campo, só que em qualquer celular.
            </h2>
            <p className="text-foreground/70 leading-relaxed">
              Gols, cartões, substituições e observações. Cronologia dos tempos. Escalação com titulares e reservas. Fechou o jogo, a tabela atualiza sozinha.
            </p>
          </div>
          <SumulaForm />

          <div className="lg:order-2 lg:py-10">
            <p className="text-sm text-brand font-medium mb-3">Formatos sem trava</p>
            <h2 className="font-display text-3xl lg:text-4xl leading-[1.1] mb-5">
              Pontos corridos, mata-mata, grupos, playoff. A tabela sai pronta.
            </h2>
            <p className="text-foreground/70 leading-relaxed">
              Define o formato, os critérios de desempate e as datas. A gente gera o chaveamento e avança as fases. Vinculou Série B à Série A, as duas tabelas se linkam pro público.
            </p>
          </div>
          <div className="lg:order-1">
            <FormatosPreview />
          </div>
        </div>
      </section>

      {/* CAMPEONATOS ATIVOS — só mostra quando tem */}
      {!loading && campeonatos.length > 0 && (
        <section id="campeonatos" className="border-t border-border">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="flex items-end justify-between gap-6 mb-8">
              <div>
                <h2 className="font-display text-3xl lg:text-4xl">Campeonatos abertos</h2>
                <p className="text-sm text-muted-foreground mt-2">O link público é aberto. Qualquer pessoa vê.</p>
              </div>
              <div className="w-56">
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar"
                  className="w-full h-10 rounded-md border border-foreground/15 bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>
            </div>
            <div className="divide-y divide-border border-y border-border">
              {filtrados.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/campeonato/${c.id}`)}
                  className="group w-full flex items-center justify-between py-5 text-left hover:bg-foreground/[0.02] px-2 -mx-2 transition-colors"
                >
                  <div>
                    <p className="font-display text-xl">{c.nome}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      <span className="font-scoreboard">{c.qtdTimes}</span> times · {statusTexto(c.status)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {loading && (
        <section className="max-w-6xl mx-auto px-6 py-10 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando campeonatos
        </section>
      )}

      {/* CTA simples */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-20 lg:py-24 text-center">
          <h2 className="font-display text-3xl lg:text-5xl max-w-2xl mx-auto leading-[1.1]">
            Seu próximo clássico começa aqui.
          </h2>
          <p className="mt-5 text-foreground/70 max-w-md mx-auto">
            Criação rápida e com todos os recursos pra gerenciar seu campeonato.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Button size="lg" onClick={() => navigate('/cadastro')}>Criar meu campeonato</Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/login')}>Já tenho conta</Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span>·</span>
            <span>Ouro Preto, 2026</span>
          </div>
          <nav className="flex items-center gap-5">
            <a href="#" className="hover:text-foreground">Termos</a>
            <a href="#" className="hover:text-foreground">Privacidade</a>
            <a href="#" className="hover:text-foreground">Contato</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function statusTexto(s: string): string {
  if (s === 'EM_ANDAMENTO') return 'em andamento';
  if (s === 'ENCERRADO') return 'encerrado';
  return 'em breve';
}

/* Súmula-styled classification preview. É o produto mostrado como sinatura. */
function SumulaPreview() {
  const linhas = [
    { pos: 1, nome: 'Atlético Vila Nova', cor: '#c84b1c', abrev: 'AVN', p: 19, j: 7 },
    { pos: 2, nome: 'Grêmio Jardim São Pedro', cor: '#4a7a3e', abrev: 'GJS', p: 15, j: 7 },
    { pos: 3, nome: 'União Santa Mônica', cor: '#14213d', abrev: 'USM', p: 14, j: 7 },
    { pos: 4, nome: 'São José AC', cor: '#b8871e', abrev: 'SJA', p: 12, j: 7 },
    { pos: 5, nome: 'Palestra Itália FC', cor: '#6a6355', abrev: 'PIT', p: 11, j: 7 },
  ];
  return (
    <div className="relative">
      <div className="bg-card rounded-sm border border-foreground/15 shadow-sm">
        <div className="flex items-baseline justify-between px-5 pt-5 pb-3 border-b border-border">
          <div>
            <p className="text-[10px] text-muted-foreground">placar/io · aberto</p>
            <p className="font-display text-lg mt-0.5">Copa Zona Leste 2026</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Rodada <span className="font-scoreboard">07</span>/<span className="font-scoreboard">10</span>
          </p>
        </div>

        <div className="px-5 py-2 flex items-center gap-4 text-[10px] text-muted-foreground border-b border-border/50">
          <span className="w-4">#</span>
          <span className="flex-1">Time</span>
          <span className="w-8 text-right">P</span>
          <span className="w-8 text-right">J</span>
          <span className="w-8 text-right hidden sm:inline">V</span>
          <span className="w-8 text-right hidden sm:inline">GP</span>
        </div>

        <div className="sumula-grid">
          {linhas.map((l) => (
            <div key={l.pos} className="px-5 flex items-center gap-4 h-[56px]">
              <span className={`w-4 font-scoreboard text-sm ${l.pos === 1 ? 'text-brand' : 'text-foreground/60'}`}>
                {l.pos}
              </span>
              <span className="flex-1 flex items-center gap-3 min-w-0">
                <span
                  className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0"
                  style={{ backgroundColor: l.cor }}
                >
                  {l.abrev}
                </span>
                <span className="text-sm truncate">{l.nome}</span>
              </span>
              <span className={`w-8 text-right font-scoreboard ${l.pos === 1 ? 'text-brand font-bold' : ''}`}>{l.p}</span>
              <span className="w-8 text-right font-scoreboard text-foreground/60">{l.j}</span>
              <span className="w-8 text-right font-scoreboard text-foreground/60 hidden sm:inline">
                {Math.max(0, l.p - (7 - l.j) - 1)}
              </span>
              <span className="w-8 text-right font-scoreboard text-foreground/60 hidden sm:inline">
                {Math.round(l.p * 0.9)}
              </span>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Atualizado agora · tabela pública</span>
          <span className="font-scoreboard">placar.io/zl-2026</span>
        </div>
      </div>
      <div className="absolute -z-10 inset-x-6 -bottom-3 h-4 bg-foreground/5 blur-md rounded-full" aria-hidden />
    </div>
  );
}

function SumulaForm() {
  return (
    <div className="bg-card rounded-sm border border-foreground/15 shadow-sm">
      <div className="flex items-baseline justify-between px-5 py-3 border-b border-border">
        <p className="text-sm">Súmula · partida <span className="font-scoreboard">057</span></p>
        <p className="text-xs text-muted-foreground font-scoreboard">38'</p>
      </div>
      <div className="p-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="text-right">
          <p className="text-sm">Atlético Vila Nova</p>
          <p className="text-xs text-muted-foreground">Mandante</p>
        </div>
        <p className="font-scoreboard text-4xl font-bold">
          <span className="text-brand">2</span>
          <span className="text-muted-foreground mx-1">–</span>
          <span>1</span>
        </p>
        <div>
          <p className="text-sm">Grêmio JSP</p>
          <p className="text-xs text-muted-foreground">Visitante</p>
        </div>
      </div>
      <div className="px-5 py-3 border-t border-border space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span>⚽ Rafael · Atlético</span>
          <span className="font-scoreboard text-muted-foreground">12'</span>
        </div>
        <div className="flex items-center justify-between">
          <span>⚽ Leandro · Grêmio</span>
          <span className="font-scoreboard text-muted-foreground">41'</span>
        </div>
        <div className="flex items-center justify-between">
          <span>⚽ Rafael · Atlético <span className="text-muted-foreground">(PN)</span></span>
          <span className="font-scoreboard text-muted-foreground">58'</span>
        </div>
        <div className="flex items-center justify-between">
          <span>↔ Marcelo entra, Tiago sai · Grêmio</span>
          <span className="font-scoreboard text-muted-foreground">72'</span>
        </div>
      </div>
    </div>
  );
}

function FormatosPreview() {
  const chaves = [
    { fase: 'Quartas', confrontos: [['Atlético', 'São José'], ['Grêmio', 'Palestra']] },
    { fase: 'Semifinal', confrontos: [['Atlético', 'Grêmio'], ['União', 'Mooca']] },
    { fase: 'Final', confrontos: [['Atlético', 'União']] },
  ];
  return (
    <div className="bg-card rounded-sm border border-foreground/15 shadow-sm p-5">
      <div className="flex items-baseline justify-between mb-5">
        <p className="text-sm">Playoff · Copa ZL 2026</p>
        <p className="text-xs text-muted-foreground font-scoreboard">3 fases</p>
      </div>
      <div className="grid grid-cols-3 gap-5">
        {chaves.map((c, idx) => (
          <div key={c.fase}>
            <p className="text-[10px] text-muted-foreground mb-3">{c.fase}</p>
            <div className="space-y-2">
              {c.confrontos.map((dupla, i) => (
                <div key={i} className="border border-border rounded-sm">
                  <p className={`px-2 py-1.5 text-xs ${idx === 2 && i === 0 ? 'text-brand font-medium' : ''}`}>{dupla[0]}</p>
                  <div className="border-t border-border" />
                  <p className="px-2 py-1.5 text-xs text-muted-foreground">{dupla[1]}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
