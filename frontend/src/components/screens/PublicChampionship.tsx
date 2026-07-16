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
  api, Artilheiro, CampeonatoPublico, ClassificacaoLinha, Formato, Partida, Rodada, StatusCampeonato,
} from '../../lib/api';
import { useAuth } from '../../lib/useAuth';

const formatoLabel: Record<Formato, string> = { PONTOS_CORRIDOS: 'Pontos Corridos', MATA_MATA: 'Mata-Mata' };
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
  const [rodadas, setRodadas] = useState<Rodada[]>([]);
  const [scorers, setScorers] = useState<Artilheiro[]>([]);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        const [i, c, r, a] = await Promise.all([
          api.publicoCampeonato(campeonatoId),
          api.publicoClassificacao(campeonatoId),
          api.publicoRodadas(campeonatoId),
          api.publicoArtilharia(campeonatoId),
        ]);
        setInfo(i); setStandings(c); setRodadas(r); setScorers(a);
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
    if (pos <= 2) return 'text-green-700 bg-green-100';
    if (pos === standings.length && standings.length > 2) return 'text-red-600 bg-red-100';
    return 'text-gray-600 bg-gray-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center gap-2 text-gray-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando campeonato...
      </div>
    );
  }

  if (naoEncontrado || !info) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Campeonato não encontrado.</p>
        <Button onClick={() => navigate('/')}>Voltar ao início</Button>
      </div>
    );
  }

  const maxGols = scorers.length > 0 ? scorers[0].gols : 1;
  const isMataMata = info.formato === 'MATA_MATA';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity">
            <Logo size="md" />
          </button>
          <nav className="flex items-center gap-3">
            {isLogged ? (
              <Button size="sm" className="text-white bg-green-600 hover:bg-green-700" onClick={() => navigate('/dashboard')}>Meu painel</Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate('/login')}>Entrar</Button>
                <Button size="sm" className="text-white bg-green-600 hover:bg-green-700" onClick={() => navigate('/cadastro')}>Cadastrar</Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Todos os campeonatos
          </button>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">{statusLabel[info.status]}</Badge>
                <span className="text-xs text-gray-400">{formatoLabel[info.formato]}</span>
              </div>
              <h1 className="text-gray-900 mb-4 text-[1.75rem] font-bold">{info.nome}</h1>
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-gray-400" />{info.qtdTimes} times</span>
                {info.descricao && (
                  <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-gray-400" />{info.descricao}</span>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              {[
                { label: 'Rodadas', value: `${info.rodadasJogadas}/${info.rodadasTotais}` },
                { label: 'Partidas', value: String(info.totalPartidas) },
                { label: 'Gols', value: String(info.totalGols) },
              ].map((s, i) => (
                <div key={i} className="text-center px-5 py-3 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-gray-900 text-xl font-bold">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-8 py-8 pb-24">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-white border border-gray-200">
            {isMataMata ? (
              <TabsTrigger value="bracket">Chaveamento</TabsTrigger>
            ) : (
              <>
                <TabsTrigger value="standings">Classificação</TabsTrigger>
                <TabsTrigger value="rounds">Rodadas</TabsTrigger>
              </>
            )}
            <TabsTrigger value="scorers">Artilharia</TabsTrigger>
          </TabsList>

          <TabsContent value="bracket">
            <Chaveamento rodadas={rodadas} />
          </TabsContent>

          <TabsContent value="standings">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <h3 className="text-sm text-gray-700 font-semibold">Classificação geral</h3>
              </div>
              {standings.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">Nenhuma partida registrada ainda.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                      {['#', 'Time', 'P', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG'].map(col => (
                        <TableHead key={col} className={`text-gray-500 text-xs uppercase tracking-wide font-semibold ${col === 'Time' ? '' : 'text-center'}`}>{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standings.map(team => (
                      <TableRow key={team.timeId} className={`hover:bg-gray-50 border-l-[3px] ${
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
                            <span className="text-gray-900 text-sm font-medium">{team.nome}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-green-600">{team.pontos}</TableCell>
                        <TableCell className="text-center text-gray-600 text-sm">{team.jogos}</TableCell>
                        <TableCell className="text-center text-gray-600 text-sm">{team.vitorias}</TableCell>
                        <TableCell className="text-center text-gray-600 text-sm">{team.empates}</TableCell>
                        <TableCell className="text-center text-gray-600 text-sm">{team.derrotas}</TableCell>
                        <TableCell className="text-center text-gray-600 text-sm">{team.golsPro}</TableCell>
                        <TableCell className="text-center text-gray-600 text-sm">{team.golsContra}</TableCell>
                        <TableCell className={`text-center text-sm font-medium ${
                          team.saldo > 0 ? 'text-green-600' : team.saldo < 0 ? 'text-red-500' : 'text-gray-500'
                        }`}>
                          {team.saldo > 0 ? `+${team.saldo}` : team.saldo}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-400 flex items-center gap-6 flex-wrap">
                <span>P: Pontos</span><span>J: Jogos</span><span>V: Vitórias</span><span>E: Empates</span>
                <span>D: Derrotas</span><span>GP: Gols Pró</span><span>GC: Gols Contra</span><span>SG: Saldo</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rounds">
            <div className="space-y-6">
              {rodadas.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-sm text-gray-500">Nenhuma rodada gerada ainda.</div>
              ) : rodadas.map((round, ri) => (
                <div key={ri} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                    <span className="text-sm font-semibold text-green-600">{round.titulo}</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {round.partidas.map(match => (
                      <div key={match.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex items-center gap-3 flex-1 justify-end">
                          <span className="text-sm text-gray-900 text-right font-medium">{match.mandante?.nome ?? 'A definir'}</span>
                          <TeamShield size="xs" />
                        </div>
                        <div className="flex items-center gap-2 mx-6">
                          {match.status === 'CONCLUIDA' && match.golsMandante != null ? (
                            <>
                              <span className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center text-sm font-bold">{match.golsMandante}</span>
                              <span className="text-gray-300 text-xs">×</span>
                              <span className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center text-sm font-bold">{match.golsVisitante}</span>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">a jogar</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-1">
                          <TeamShield size="xs" />
                          <span className="text-sm text-gray-900 font-medium">{match.visitante?.nome ?? (match.status === 'CONCLUIDA' ? 'Bye' : 'A definir')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="scorers">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-sm text-gray-700 font-semibold">Artilharia</h3>
              </div>
              {scorers.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">Nenhum gol registrado ainda.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {scorers.map((scorer, idx) => (
                    <div key={scorer.jogadorId} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 font-bold ${idx === 0 ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{idx + 1}</span>
                      <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500 shrink-0 font-semibold">
                        {scorer.jogadorNome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 font-medium">{scorer.jogadorNome}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <TeamShield size="xs" />
                          <span className="text-xs text-gray-500">{scorer.timeNome}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-green-500" />
                        <span className="font-bold text-green-600 text-lg">{scorer.gols}</span>
                        <span className="text-xs text-gray-400">gols</span>
                      </div>
                      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-green-600" style={{ width: `${(scorer.gols / maxGols) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </section>

      <footer className="border-t border-gray-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-8 flex items-center justify-between">
          <Logo size="sm" />
          <p className="text-xs text-gray-400">© Placar.io — Gestão de campeonatos amadores</p>
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
    <div className={`flex items-center gap-2 px-3 py-2 ${vencedor ? 'bg-green-50' : ''}`}>
      <TeamShield size="xs" />
      <span className={`text-sm flex-1 truncate ${vencedor ? 'text-gray-900 font-semibold' : 'text-gray-600 font-normal'}`}>
        {nome}
      </span>
      <span className={`text-sm w-6 text-center ${vencedor ? 'text-green-700 font-bold' : 'text-gray-500 font-medium'}`}>
        {gols != null ? gols : (decidido ? '' : '–')}
      </span>
    </div>
  );
}

function Chaveamento({ rodadas }: { rodadas: Rodada[] }) {
  if (rodadas.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-sm text-gray-500">
        Chaveamento ainda não gerado.
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 overflow-x-auto">
      <div className="flex gap-8 min-w-max">
        {rodadas.map((fase, i) => (
          <div key={i} className="flex flex-col min-w-[230px]">
            <p className="text-center text-sm mb-4 font-semibold text-green-600">{fase.titulo}</p>
            <div className="flex flex-col justify-around gap-6 flex-1">
              {fase.partidas.map(m => {
                const vId = vencedorId(m);
                const decidido = m.status === 'CONCLUIDA';
                return (
                  <div key={m.id} className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                    <LinhaTime
                      nome={m.mandante?.nome ?? 'A definir'}
                      gols={m.golsMandante}
                      vencedor={vId != null && vId === m.mandante?.id}
                      decidido={decidido}
                    />
                    <div className="h-px bg-gray-100" />
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
