import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowRight, ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, LayoutDashboard, Loader2, LogOut } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Logo } from '../Logo';
import { TeamShield } from '../TeamShield';
import {
  api, Artilheiro, CampeonatoPublico, ClassificacaoGrupo, ClassificacaoLinha,
  FaixaTabela, Formato, Partida, Rodada,
} from '../../lib/api';
import { useAuth } from '../../lib/useAuth';

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase() || 'U';
}

const formatoLabel: Record<Formato, string> = {
  PONTOS_CORRIDOS: 'pontos corridos',
  MATA_MATA: 'mata-mata',
  GRUPOS: 'fase de grupos',
  GRUPOS_MATA_MATA: 'grupos + mata-mata',
  PONTOS_CORRIDOS_MATA_MATA: 'liga + playoff',
};

const FORMATOS_COM_GRUPOS: Formato[] = ['GRUPOS', 'GRUPOS_MATA_MATA'];
type Aba = 'classificacao' | 'artilharia' | 'times';

function faixaDe(pos: number, faixas: FaixaTabela[] | null | undefined): FaixaTabela | null {
  if (!faixas) return null;
  return faixas.find((f) => pos >= f.posInicio && pos <= f.posFim) ?? null;
}
function formatarDataCurta(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const dia = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').slice(0, 3);
  const diaCap = dia.charAt(0).toUpperCase() + dia.slice(1);
  const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `${diaCap}, ${data}`;
}

export function PublicChampionship() {
  const navigate = useNavigate();
  const { id } = useParams();
  const campeonatoId = Number(id);
  const { isLogged, usuario, sair } = useAuth();

  const [aba, setAba] = useState<Aba>('classificacao');
  const [loading, setLoading] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [info, setInfo] = useState<CampeonatoPublico | null>(null);
  const [tabela, setTabela] = useState<ClassificacaoLinha[]>([]);
  const [grupos, setGrupos] = useState<ClassificacaoGrupo[]>([]);
  const [rodadas, setRodadas] = useState<Rodada[]>([]);
  const [artilheiros, setArtilheiros] = useState<Artilheiro[]>([]);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        const i = await api.publicoCampeonato(campeonatoId);
        const temGrupos = FORMATOS_COM_GRUPOS.includes(i.formato);
        const [c, g, r, a] = await Promise.all([
          api.publicoClassificacao(campeonatoId),
          temGrupos ? api.publicoClassificacaoGrupos(campeonatoId) : Promise.resolve([] as ClassificacaoGrupo[]),
          api.publicoRodadas(campeonatoId),
          api.publicoArtilharia(campeonatoId),
        ]);
        setInfo(i); setTabela(c); setGrupos(g); setRodadas(r); setArtilheiros(a);
      } catch { setNaoEncontrado(true); }
      finally { setLoading(false); }
    }
    if (!isNaN(campeonatoId)) carregar();
    else { setNaoEncontrado(true); setLoading(false); }
  }, [campeonatoId]);

  const totalRodadas = rodadas.length;
  const rodadasConcluidas = useMemo(
    () => rodadas.filter((r) => r.partidas.every((p) => p.status === 'CONCLUIDA')).length,
    [rodadas],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando
      </div>
    );
  }
  if (naoEncontrado || !info) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-6">
        <Logo size="lg" />
        <h1 className="mt-6 font-display text-3xl">Campeonato não encontrado</h1>
        <Button className="mt-6" onClick={() => navigate('/')}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size="md" />
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
                <Button size="sm" onClick={() => navigate('/cadastro')}>Criar campeonato</Button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16 grid lg:grid-cols-[1fr_auto] gap-8 items-end">
          <div>
            <p className="text-sm text-muted-foreground">
              {formatoLabel[info.formato]}
              {info.status === 'EM_ANDAMENTO' && <> · rodada <span className="font-scoreboard">{rodadasConcluidas + 1}</span> de <span className="font-scoreboard">{totalRodadas}</span></>}
              {info.status === 'ENCERRADO' && ' · encerrado'}
            </p>
            <h1 className="font-display text-5xl lg:text-6xl mt-2 leading-[1.05]">{info.nome}</h1>
            {info.descricao && <p className="mt-4 text-foreground/70 max-w-2xl leading-relaxed">{info.descricao}</p>}
          </div>

          <dl className="grid grid-cols-3 gap-8 text-right lg:text-left">
            <Figura rotulo="Times" valor={info.qtdTimes} />
            <Figura rotulo="Partidas" valor={info.totalPartidas} segundo={info.partidasJogadas} />
            <Figura rotulo="Gols" valor={info.totalGols} />
          </dl>
        </div>

        {(info.campeonatoVinculado || info.vinculados.length > 0) && (
          <div className="max-w-7xl mx-auto px-6 pb-6 flex flex-wrap gap-2">
            {info.campeonatoVinculado && (
              <button
                onClick={() => navigate(`/campeonato/${info.campeonatoVinculado!.id}`)}
                className="inline-flex items-center gap-2 text-sm text-foreground hover:text-brand"
              >
                Ver {info.campeonatoVinculado.nome} <ArrowRight className="h-3 w-3" />
              </button>
            )}
            {info.vinculados.map((v) => (
              <button
                key={v.id}
                onClick={() => navigate(`/campeonato/${v.id}`)}
                className="inline-flex items-center gap-2 text-sm text-foreground hover:text-brand"
              >
                Ver {v.nome} <ArrowRight className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 flex gap-6 text-sm overflow-x-auto">
          {(['classificacao', 'artilharia', 'times'] as Aba[]).map((a) => (
            <button
              key={a}
              onClick={() => setAba(a)}
              className={`h-12 border-b-2 -mb-px ${
                aba === a ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {a === 'classificacao'
                ? (info.formato === 'MATA_MATA' ? 'Jogos' : 'Classificação')
                : a === 'artilharia' ? 'Artilharia' : 'Times'}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {aba === 'classificacao' && (
          info.formato === 'MATA_MATA' ? (
            <>
              <RodadaNavigator rodadas={rodadas} />
              <div className="mt-12 max-w-2xl">
                <ArtilheirosTop5 artilheiros={artilheiros.slice(0, 5)} />
              </div>
            </>
          ) : (
            <>
              <div className="grid lg:grid-cols-[1fr_360px] gap-10 items-start">
                <div className="min-w-0">
                  <Classificacao tabela={tabela} grupos={grupos} faixas={info.faixasTabela} />
                </div>
                <div className="min-w-0">
                  <RodadaNavigator rodadas={rodadas} />
                </div>
              </div>
              <div className="mt-12 max-w-2xl">
                <ArtilheirosTop5 artilheiros={artilheiros.slice(0, 5)} />
              </div>
            </>
          )
        )}
        {aba === 'artilharia' && <ArtilhariaCompleta artilheiros={artilheiros} />}
        {aba === 'times' && <TimesLista tabela={tabela} />}
      </main>

      <footer className="border-t border-border mt-10">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <Logo size="sm" /><span>·</span><span>Tabela pública</span>
          </div>
          <a href="/" className="hover:text-foreground">placar/io</a>
        </div>
      </footer>
    </div>
  );
}

function Figura({ rotulo, valor, segundo }: { rotulo: string; valor: number; segundo?: number }) {
  return (
    <div>
      <p className="font-scoreboard text-3xl">
        {segundo !== undefined ? <><span>{segundo}</span><span className="text-muted-foreground">/{valor}</span></> : valor}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{rotulo}</p>
    </div>
  );
}

function Classificacao({ tabela, grupos, faixas }: { tabela: ClassificacaoLinha[]; grupos: ClassificacaoGrupo[]; faixas: FaixaTabela[] | null }) {
  if (grupos.length > 0) {
    return (
      <div className="space-y-10">
        {grupos.map((g) => (
          <div key={g.grupoId}>
            <h2 className="font-display text-2xl mb-4">Grupo {g.nome}</h2>
            <TabelaBase linhas={g.linhas} faixas={faixas} />
          </div>
        ))}
        {faixas && faixas.length > 0 && <Legenda faixas={faixas} />}
      </div>
    );
  }
  return (
    <div>
      <h2 className="font-display text-2xl mb-4">Classificação</h2>
      <TabelaBase linhas={tabela} faixas={faixas} />
      {faixas && faixas.length > 0 && <div className="mt-4"><Legenda faixas={faixas} /></div>}
    </div>
  );
}

function TabelaBase({ linhas, faixas }: { linhas: ClassificacaoLinha[]; faixas: FaixaTabela[] | null }) {
  if (linhas.length === 0) return <p className="text-sm text-muted-foreground py-6">Sem times cadastrados.</p>;
  return (
    <div className="border border-border rounded-sm bg-card overflow-hidden">
      <div className="grid grid-cols-[24px_32px_1fr_44px_44px_44px_44px_44px_44px_44px_50px] items-center gap-3 px-4 py-2 text-[10px] text-muted-foreground border-b border-border">
        <span />
        <span>#</span>
        <span>Time</span>
        <span className="text-right">P</span>
        <span className="text-right">J</span>
        <span className="text-right">V</span>
        <span className="text-right">E</span>
        <span className="text-right">D</span>
        <span className="text-right">GP</span>
        <span className="text-right">GC</span>
        <span className="text-right">SG</span>
      </div>
      <div className="divide-y divide-border">
        {linhas.map((l) => {
          const f = faixaDe(l.posicao, faixas);
          return (
            <div key={l.timeId} className="grid grid-cols-[24px_32px_1fr_44px_44px_44px_44px_44px_44px_44px_50px] items-center gap-3 px-4 h-14">
              <span className="h-6 w-1" style={{ backgroundColor: f?.cor ?? 'transparent' }} />
              <span className={`font-scoreboard text-sm ${l.posicao === 1 ? 'text-brand font-bold' : 'text-foreground/70'}`}>{l.posicao}</span>
              <span className="flex items-center gap-3 min-w-0">
                <TeamShield nome={l.nome} cor={l.cor} abreviacao={l.abreviacao} escudoUrl={l.escudoUrl} size="sm" />
                <span className="text-sm truncate">{l.nome}</span>
              </span>
              <span className="text-right font-scoreboard font-semibold">{l.pontos}</span>
              <span className="text-right font-scoreboard text-foreground/60">{l.jogos}</span>
              <span className="text-right font-scoreboard text-foreground/60">{l.vitorias}</span>
              <span className="text-right font-scoreboard text-foreground/60">{l.empates}</span>
              <span className="text-right font-scoreboard text-foreground/60">{l.derrotas}</span>
              <span className="text-right font-scoreboard text-foreground/60">{l.golsPro}</span>
              <span className="text-right font-scoreboard text-foreground/60">{l.golsContra}</span>
              <span className={`text-right font-scoreboard ${l.saldo > 0 ? 'text-foreground' : l.saldo < 0 ? 'text-destructive' : 'text-foreground/60'}`}>
                {l.saldo > 0 ? `+${l.saldo}` : l.saldo}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Legenda({ faixas }: { faixas: FaixaTabela[] }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
      {faixas.map((f, i) => (
        <span key={i} className="inline-flex items-center gap-2">
          <span className="h-2.5 w-1" style={{ backgroundColor: f.cor }} />
          {f.legenda}
        </span>
      ))}
    </div>
  );
}

function RodadaNavigator({ rodadas }: { rodadas: Rodada[] }) {
  // Default: primeira rodada ainda com partida aberta, ou a última.
  const rodadaInicial = useMemo(() => {
    const idx = rodadas.findIndex((r) => r.partidas.some((p) => p.status !== 'CONCLUIDA'));
    return idx < 0 ? Math.max(0, rodadas.length - 1) : idx;
  }, [rodadas]);
  const [idx, setIdx] = useState<number>(rodadaInicial);
  useEffect(() => { setIdx(rodadaInicial); }, [rodadaInicial]);

  if (rodadas.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem rodadas geradas.</p>;
  }
  const atual = rodadas[idx] ?? rodadas[0];
  const semAnterior = idx === 0;
  const semProxima = idx >= rodadas.length - 1;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-2xl">Rodadas</h2>
        <span className="text-xs text-muted-foreground">{atual.titulo}</span>
      </div>
      <div className="border border-border rounded-sm bg-card">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <button
            onClick={() => setIdx(Math.max(0, idx - 1))}
            disabled={semAnterior}
            className="h-8 w-8 rounded-sm flex items-center justify-center text-foreground/70 disabled:opacity-30 hover:bg-foreground/5"
            aria-label="Rodada anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Rodada</p>
            <p className="font-scoreboard text-xl leading-tight">
              {String(idx + 1).padStart(2, '0')}
              <span className="text-muted-foreground"> / {String(rodadas.length).padStart(2, '0')}</span>
            </p>
          </div>
          <button
            onClick={() => setIdx(Math.min(rodadas.length - 1, idx + 1))}
            disabled={semProxima}
            className="h-8 w-8 rounded-sm flex items-center justify-center text-foreground/70 disabled:opacity-30 hover:bg-foreground/5"
            aria-label="Próxima rodada"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="divide-y divide-border">
          <ListaPartidas partidas={atual.partidas} />
        </div>
      </div>
    </div>
  );
}

function ListaPartidas({ partidas }: { partidas: Partida[] }) {
  const temLegs = partidas.some((p) => p.legOrdem != null);
  if (!temLegs) {
    return <>{partidas.map((p) => <LinhaPartidaCompacta key={p.id} partida={p} />)}</>;
  }
  const pares = new Map<number, { ida?: Partida; volta?: Partida }>();
  for (const p of partidas) {
    const k = p.ordemFase ?? 0;
    const atual = pares.get(k) ?? {};
    if (p.legOrdem === 2) atual.volta = p; else atual.ida = p;
    pares.set(k, atual);
  }
  const vazio = <div className="px-3 py-3 text-xs text-muted-foreground text-center">—</div>;
  return (
    <>
      <div className="grid grid-cols-2 text-[10px] uppercase tracking-wide text-muted-foreground text-center">
        <div className="py-2 border-r border-border">Ida</div>
        <div className="py-2">Volta</div>
      </div>
      {[...pares.entries()].sort(([a], [b]) => a - b).map(([k, p]) => (
        <div key={k} className="grid grid-cols-2 divide-x divide-border">
          <div>{p.ida ? <LinhaPartidaCompacta partida={p.ida} /> : vazio}</div>
          <div>{p.volta ? <LinhaPartidaCompacta partida={p.volta} /> : vazio}</div>
        </div>
      ))}
    </>
  );
}

function LinhaPartidaCompacta({ partida }: { partida: Partida }) {
  const concluida = partida.status === 'CONCLUIDA';
  const gm = partida.golsMandante;
  const gv = partida.golsVisitante;
  const dataHora = (() => {
    if (!partida.dataPartida) return 'A definir';
    const d = new Date(partida.dataPartida);
    if (isNaN(d.getTime())) return 'A definir';
    const dia = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').slice(0, 3);
    const diaCap = dia.charAt(0).toUpperCase() + dia.slice(1);
    const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${diaCap}, ${data} · ${hora}`;
  })();
  return (
    <div className="px-3 py-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex items-center gap-2 justify-end min-w-0">
          <span className="text-sm truncate">{partida.mandante?.nome ?? 'A definir'}</span>
          <TeamShield nome={partida.mandante?.nome} cor={partida.mandante?.cor} abreviacao={partida.mandante?.abreviacao} escudoUrl={partida.mandante?.escudoUrl ?? null} size="sm" />
        </div>
        <div className="font-scoreboard text-base w-14 text-center shrink-0">
          {concluida ? <span>{gm}<span className="text-muted-foreground px-0.5">–</span>{gv}</span> : <span className="text-muted-foreground">×</span>}
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <TeamShield nome={partida.visitante?.nome} cor={partida.visitante?.cor} abreviacao={partida.visitante?.abreviacao} escudoUrl={partida.visitante?.escudoUrl ?? null} size="sm" />
          <span className="text-sm truncate">{partida.visitante?.nome ?? 'A definir'}</span>
        </div>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground text-center">{dataHora}</p>
    </div>
  );
}

function ArtilheirosTop5({ artilheiros }: { artilheiros: Artilheiro[] }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-display text-xl">Artilharia</h2>
        <span className="text-xs text-muted-foreground">Top 5</span>
      </div>
      {artilheiros.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem gols ainda.</p>
      ) : (
        <ol className="divide-y divide-border border-y border-border">
          {artilheiros.map((a, i) => (
            <li key={a.jogadorId} className="grid grid-cols-[24px_32px_1fr_40px] items-center gap-3 py-3">
              <span className={`font-scoreboard text-sm ${i === 0 ? 'text-brand font-bold' : 'text-muted-foreground'}`}>{i + 1}</span>
              <TeamShield nome={a.timeNome} cor={a.cor} abreviacao={a.abreviacao} escudoUrl={a.escudoUrl} size="sm" />
              <div className="min-w-0">
                <p className="text-sm truncate">{a.jogadorNome}</p>
                <p className="text-xs text-muted-foreground truncate">{a.timeNome}</p>
              </div>
              <span className="font-scoreboard text-right">{a.gols}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ArtilhariaCompleta({ artilheiros }: { artilheiros: Artilheiro[] }) {
  if (artilheiros.length === 0) return <p className="text-sm text-muted-foreground">Nenhum gol marcado ainda.</p>;
  return (
    <div>
      <h2 className="font-display text-2xl mb-4">Artilharia</h2>
      <div className="divide-y divide-border border-y border-border">
        {artilheiros.map((a, i) => (
          <div key={a.jogadorId} className="grid grid-cols-[24px_32px_1fr_40px] items-center gap-3 py-3 px-2 -mx-2">
            <span className={`font-scoreboard text-sm ${i === 0 ? 'text-brand font-bold' : 'text-foreground/60'}`}>{i + 1}</span>
            <TeamShield nome={a.timeNome} cor={a.cor} abreviacao={a.abreviacao} escudoUrl={a.escudoUrl} size="sm" />
            <div className="min-w-0">
              <p className="text-sm truncate">{a.jogadorNome}</p>
              <p className="text-xs text-muted-foreground truncate">{a.timeNome}</p>
            </div>
            <span className="font-scoreboard text-right">{a.gols}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimesLista({ tabela }: { tabela: ClassificacaoLinha[] }) {
  return (
    <div>
      <h2 className="font-display text-2xl mb-4">Times</h2>
      <div className="grid sm:grid-cols-2 gap-x-6 divide-y divide-border border-y border-border sm:border-0 sm:divide-y-0">
        {tabela.map((l) => (
          <div key={l.timeId} className="flex items-center gap-3 py-3 sm:border-b sm:border-border">
            <TeamShield nome={l.nome} cor={l.cor} abreviacao={l.abreviacao} escudoUrl={l.escudoUrl} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-sm truncate">{l.nome}</p>
              <p className="text-xs text-muted-foreground">
                <span className="font-scoreboard">{l.pontos}</span> pts · <span className="font-scoreboard">{l.jogos}</span> jogos
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LinhaPartida({ partida }: { partida: Partida }) {
  const concluida = partida.status === 'CONCLUIDA';
  const gm = partida.golsMandante;
  const gv = partida.golsVisitante;
  const venceMandante = concluida && gm !== null && gv !== null && gm > gv;
  const venceVisitante = concluida && gm !== null && gv !== null && gv > gm;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr_64px] items-center gap-4 py-3">
      <div className="flex items-center gap-3 justify-end text-right min-w-0">
        <span className={`text-sm truncate ${venceMandante ? 'font-medium' : ''}`}>{partida.mandante?.nome ?? '—'}</span>
        <TeamShield nome={partida.mandante?.nome} cor={partida.mandante?.cor} abreviacao={partida.mandante?.abreviacao} escudoUrl={partida.mandante?.escudoUrl ?? null} size="sm" />
      </div>
      <div className="font-scoreboard text-lg w-20 text-center">
        {concluida ? <span>{gm} <span className="text-muted-foreground">–</span> {gv}</span> : <span className="text-muted-foreground">×</span>}
      </div>
      <div className="flex items-center gap-3 min-w-0">
        <TeamShield nome={partida.visitante?.nome} cor={partida.visitante?.cor} abreviacao={partida.visitante?.abreviacao} escudoUrl={partida.visitante?.escudoUrl ?? null} size="sm" />
        <span className={`text-sm truncate ${venceVisitante ? 'font-medium' : ''}`}>{partida.visitante?.nome ?? '—'}</span>
      </div>
      <div className="text-xs text-muted-foreground text-right">
        {concluida ? '' : formatarDataCurta(partida.dataPartida)}
      </div>
    </div>
  );
}

