import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Calendar, Users, ArrowLeft, Target, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Logo } from '../Logo';
import { TeamShield } from '../TeamShield';
import {
  api, Artilheiro, CampeonatoPublico, ClassificacaoGrupo, ClassificacaoLinha, Formato, Partida, Rodada, StatusCampeonato,
} from '../../lib/api';
import { useAuth } from '../../lib/useAuth';

const formatoLabel: Record<Formato, string> = {
  PONTOS_CORRIDOS: 'Pontos corridos',
  MATA_MATA: 'Mata-mata',
  GRUPOS: 'Fase de grupos',
  GRUPOS_MATA_MATA: 'Grupos + mata-mata',
  PONTOS_CORRIDOS_MATA_MATA: 'Liga + playoff',
};

const FORMATOS_COM_GRUPOS: Formato[] = ['GRUPOS', 'GRUPOS_MATA_MATA'];
const FORMATOS_COM_KO: Formato[] = ['MATA_MATA', 'GRUPOS_MATA_MATA', 'PONTOS_CORRIDOS_MATA_MATA'];
const statusLabel: Record<StatusCampeonato, string> = { EM_ANDAMENTO: 'Em andamento', ENCERRADO: 'Encerrado', NAO_INICIADO: 'Não iniciado' };

export function PublicChampionship() {
  const navigate = useNavigate();
  const { isLogged } = useAuth();
  const { id } = useParams();
  const campeonatoId = Number(id);

  const [activeTab, setActiveTab] = useState('standings');
  const [loading, setLoading] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [info, setInfo] = useState<CampeonatoPublico | null>(null);
  const [standings, setStandings] = useState<ClassificacaoLinha[]>([]);
  const [grupos, setGrupos] = useState<ClassificacaoGrupo[]>([]);
  const [rodadas, setRodadas] = useState<Rodada[]>([]);
  const [scorers, setScorers] = useState<Artilheiro[]>([]);

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
        setInfo(i); setStandings(c); setGrupos(g); setRodadas(r); setScorers(a);
        setActiveTab(i.formato === 'MATA_MATA' ? 'bracket' : 'standings');
      } catch {
        setNaoEncontrado(true);
      } finally {
        setLoading(false);
      }
    }
    if (!isNaN(campeonatoId)) carregar();
    else { setNaoEncontrado(true); setLoading(false); }
  }, [campeonatoId]);

  const posStyle = (pos: number) => {
    if (pos <= 2) return 'text-primary bg-primary/15';
    if (pos === standings.length && standings.length > 2) return 'text-destructive bg-destructive/15';
    return 'text-muted-foreground bg-muted';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando campeonato...
      </div>
    );
  }

  if (naoEncontrado || !info) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Campeonato não encontrado.</p>
        <Button onClick={() => navigate('/')}>Voltar ao início</Button>
      </div>
    );
  }

  const maxGols = scorers.length > 0 ? scorers[0].gols : 1;
  const temKO = FORMATOS_COM_KO.includes(info.formato);
  const temGrupos = FORMATOS_COM_GRUPOS.includes(info.formato);
  const isMataMataPuro = info.formato === 'MATA_MATA';

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity">
            <Logo size="md" />
          </button>
          <nav className="flex items-center gap-3">
            {isLogged ? (
              <Button size="sm" className="text-white bg-primary hover:bg-primary/90" onClick={() => navigate('/dashboard')}>Meu painel</Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate('/login')}>Entrar</Button>
                <Button size="sm" className="text-white bg-primary hover:bg-primary/90" onClick={() => navigate('/cadastro')}>Cadastrar</Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Todos os campeonatos
          </button>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="secondary" className="bg-primary/15 text-primary text-xs">{statusLabel[info.status]}</Badge>
                <span className="text-xs text-muted-foreground">{formatoLabel[info.formato]}</span>
              </div>
              <h1 className="text-foreground mb-4 text-[1.75rem] font-bold">{info.nome}</h1>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-muted-foreground" />{info.qtdTimes} times</span>
                {info.descricao && (
                  <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-muted-foreground" />{info.descricao}</span>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              {[
                { label: 'Rodadas', value: `${info.rodadasJogadas}/${info.rodadasTotais}` },
                { label: 'Partidas', value: String(info.totalPartidas) },
                { label: 'Gols', value: String(info.totalGols) },
              ].map((s, i) => (
                <div key={i} className="text-center px-5 py-3 bg-background rounded-xl border border-border">
                  <p className="text-foreground text-xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-8 py-8 pb-24">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-card border border-border">
            {!isMataMataPuro && <TabsTrigger value="standings">Classificação</TabsTrigger>}
            {temGrupos && <TabsTrigger value="groups">Grupos</TabsTrigger>}
            {!isMataMataPuro && <TabsTrigger value="rounds">Rodadas</TabsTrigger>}
            {temKO && <TabsTrigger value="bracket">Chaveamento</TabsTrigger>}
            <TabsTrigger value="scorers">Artilharia</TabsTrigger>
          </TabsList>

          {temGrupos && (
            <TabsContent value="groups">
              <div className="space-y-6">
                {grupos.map(g => (
                  <div key={g.grupoId} className="bg-card rounded-xl border border-border overflow-hidden">
                    <div className="px-6 py-3 border-b border-border">
                      <h3 className="text-sm text-foreground font-semibold">Grupo {g.nome}</h3>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="text-muted-foreground text-xs font-semibold w-10">#</TableHead>
                          <TableHead className="text-muted-foreground text-xs font-semibold">Time</TableHead>
                          <TableHead className="text-muted-foreground text-xs font-semibold text-center w-14">P</TableHead>
                          <TableHead className="text-muted-foreground text-xs font-semibold text-center w-14">J</TableHead>
                          <TableHead className="text-muted-foreground text-xs font-semibold text-center w-14">SG</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {g.linhas.map(l => (
                          <TableRow key={l.timeId} className="hover:bg-muted/40">
                            <TableCell className="text-sm text-muted-foreground">{l.posicao}</TableCell>
                            <TableCell className="text-sm text-foreground font-medium">{l.nome}</TableCell>
                            <TableCell className="text-sm text-center font-semibold">{l.pontos}</TableCell>
                            <TableCell className="text-sm text-center">{l.jogos}</TableCell>
                            <TableCell className={`text-sm text-center font-medium ${l.saldo > 0 ? 'text-primary' : l.saldo < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{l.saldo > 0 ? `+${l.saldo}` : l.saldo}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            </TabsContent>
          )}

          <TabsContent value="bracket">
            <Chaveamento rodadas={rodadas} />
          </TabsContent>

          <TabsContent value="standings">
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center gap-3">
                <h3 className="text-sm text-foreground font-semibold">Classificação geral</h3>
              </div>
              {standings.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Nenhuma partida registrada ainda.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-background/80 hover:bg-background/80">
                      {['#', 'Time', 'P', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG'].map(col => (
                        <TableHead key={col} className={`text-muted-foreground text-xs uppercase tracking-wide font-semibold ${col === 'Time' ? '' : 'text-center'}`}>{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standings.map(team => (
                      <TableRow key={team.timeId} className={`hover:bg-background border-l-[3px] ${
                        team.posicao <= 2 ? 'border-green-600'
                          : (team.posicao === standings.length && standings.length > 2) ? 'border-red-500'
                          : 'border-transparent'
                      }`}>
                        <TableCell className="text-center">
                          <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${posStyle(team.posicao)}`}>{team.posicao}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <TeamShield size="xs" />
                            <span className="text-foreground text-sm font-medium">{team.nome}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-primary">{team.pontos}</TableCell>
                        <TableCell className="text-center text-muted-foreground text-sm">{team.jogos}</TableCell>
                        <TableCell className="text-center text-muted-foreground text-sm">{team.vitorias}</TableCell>
                        <TableCell className="text-center text-muted-foreground text-sm">{team.empates}</TableCell>
                        <TableCell className="text-center text-muted-foreground text-sm">{team.derrotas}</TableCell>
                        <TableCell className="text-center text-muted-foreground text-sm">{team.golsPro}</TableCell>
                        <TableCell className="text-center text-muted-foreground text-sm">{team.golsContra}</TableCell>
                        <TableCell className={`text-center text-sm font-medium ${
                          team.saldo > 0 ? 'text-primary' : team.saldo < 0 ? 'text-destructive' : 'text-muted-foreground'
                        }`}>
                          {team.saldo > 0 ? `+${team.saldo}` : team.saldo}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="px-6 py-3 border-t border-border bg-background/50 text-xs text-muted-foreground flex items-center gap-6 flex-wrap">
                <span>P: Pontos</span><span>J: Jogos</span><span>V: Vitórias</span><span>E: Empates</span>
                <span>D: Derrotas</span><span>GP: Gols Pró</span><span>GC: Gols Contra</span><span>SG: Saldo</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rounds">
            <div className="space-y-6">
              {rodadas.length === 0 ? (
                <div className="bg-card rounded-xl border border-border py-12 text-center text-sm text-muted-foreground">Nenhuma rodada gerada ainda.</div>
              ) : rodadas.map((round, ri) => (
                <div key={ri} className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="px-6 py-3 border-b border-border bg-background/50 flex items-center gap-3">
                    <span className="text-sm font-semibold text-primary">{round.titulo}</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {round.partidas.map(match => (
                      <div key={match.id} className="px-6 py-4 flex items-center justify-between hover:bg-background">
                        <div className="flex items-center gap-3 flex-1 justify-end">
                          <span className="text-sm text-foreground text-right font-medium">{match.mandante?.nome ?? 'A definir'}</span>
                          <TeamShield size="xs" />
                        </div>
                        <div className="flex items-center gap-2 mx-6">
                          {match.status === 'CONCLUIDA' && match.golsMandante != null ? (
                            <>
                              <span className="w-8 h-8 rounded-lg bg-foreground text-background flex items-center justify-center text-sm font-bold">{match.golsMandante}</span>
                              <span className="text-muted-foreground/60 text-xs">×</span>
                              <span className="w-8 h-8 rounded-lg bg-foreground text-background flex items-center justify-center text-sm font-bold">{match.golsVisitante}</span>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">a jogar</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-1">
                          <TeamShield size="xs" />
                          <span className="text-sm text-foreground font-medium">{match.visitante?.nome ?? (match.status === 'CONCLUIDA' ? 'Bye' : 'A definir')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="scorers">
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-sm text-foreground font-semibold">Artilharia</h3>
              </div>
              {scorers.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Nenhum gol registrado ainda.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {scorers.map((scorer, idx) => (
                    <div key={scorer.jogadorId} className="px-6 py-4 flex items-center gap-4 hover:bg-background">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 font-bold ${idx === 0 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>{idx + 1}</span>
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground shrink-0 font-semibold">
                        {scorer.jogadorNome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground font-medium">{scorer.jogadorNome}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <TeamShield size="xs" />
                          <span className="text-xs text-muted-foreground">{scorer.timeNome}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-green-500" />
                        <span className="font-bold text-primary text-lg">{scorer.gols}</span>
                        <span className="text-xs text-muted-foreground">gols</span>
                      </div>
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(scorer.gols / maxGols) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </section>

      <footer className="border-t border-border bg-card py-6">
        <div className="max-w-7xl mx-auto px-8 flex items-center justify-between">
          <Logo size="sm" />
          <p className="text-xs text-muted-foreground">© Placar.io — Gestão de campeonatos amadores</p>
        </div>
      </footer>
    </div>
  );
}

function vencedorId(m: Partida): number | null {
  if (m.status !== 'CONCLUIDA') return null;
  if (!m.visitante) return m.mandante?.id ?? null;
  if (m.golsMandante == null || m.golsVisitante == null) return null;
  if (m.golsMandante > m.golsVisitante) return m.mandante?.id ?? null;
  if (m.golsVisitante > m.golsMandante) return m.visitante?.id ?? null;
  return null;
}

function LinhaTime({ nome, gols, vencedor, decidido }: {
  nome: string; gols: number | null; vencedor: boolean; decidido: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 ${vencedor ? 'bg-primary/10' : ''}`}>
      <TeamShield size="xs" />
      <span className={`text-sm flex-1 truncate ${vencedor ? 'text-foreground font-semibold' : 'text-muted-foreground font-normal'}`}>
        {nome}
      </span>
      <span className={`text-sm w-6 text-center ${vencedor ? 'text-primary font-bold' : 'text-muted-foreground font-medium'}`}>
        {gols != null ? gols : (decidido ? '' : '–')}
      </span>
    </div>
  );
}

function Chaveamento({ rodadas }: { rodadas: Rodada[] }) {
  if (rodadas.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border py-12 text-center text-sm text-muted-foreground">
        Chaveamento ainda não gerado.
      </div>
    );
  }
  return (
    <div className="bg-card rounded-xl border border-border p-6 overflow-x-auto">
      <div className="flex gap-8 min-w-max">
        {rodadas.map((fase, i) => (
          <div key={i} className="flex flex-col min-w-[230px]">
            <p className="text-center text-sm mb-4 font-semibold text-primary">{fase.titulo}</p>
            <div className="flex flex-col justify-around gap-6 flex-1">
              {fase.partidas.map(m => {
                const vId = vencedorId(m);
                const decidido = m.status === 'CONCLUIDA';
                return (
                  <div key={m.id} className="rounded-lg border border-border overflow-hidden shadow-sm">
                    <LinhaTime
                      nome={m.mandante?.nome ?? 'A definir'}
                      gols={m.golsMandante}
                      vencedor={vId != null && vId === m.mandante?.id}
                      decidido={decidido}
                    />
                    <div className="h-px bg-muted" />
                    <LinhaTime
                      nome={m.visitante?.nome ?? (decidido ? 'Bye' : 'A definir')}
                      gols={m.golsVisitante}
                      vencedor={vId != null && vId === m.visitante?.id}
                      decidido={decidido}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
