import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Calendar, MapPin, ChevronRight, Plus, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { OrganizerLayout } from '../OrganizerLayout';
import { TeamShield } from '../TeamShield';
import { api, ApiError, Partida, Rodada, StatusPartida } from '../../lib/api';
import { campeonatoAtivo, partidaAtiva } from '../../lib/session';

const statusStyle: Record<StatusPartida, string> = {
  CONCLUIDA: 'bg-green-100 text-green-700',
  AGENDADA: 'bg-gray-100 text-gray-500',
  EM_ANDAMENTO: 'bg-yellow-100 text-yellow-700',
};

const statusLabel: Record<StatusPartida, string> = {
  CONCLUIDA: 'Concluída',
  AGENDADA: 'Pendente',
  EM_ANDAMENTO: 'Em andamento',
};

function formatarData(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR');
}

export function RoundsMatches() {
  const navigate = useNavigate();
  const ativo = campeonatoAtivo.get();

  const [rodadas, setRodadas] = useState<Rodada[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!ativo) { navigate('/dashboard'); return; }
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregar() {
    if (!ativo) return;
    setLoading(true);
    try {
      setRodadas(await api.listarPartidas(ativo.id));
    } finally {
      setLoading(false);
    }
  }

  async function gerar() {
    if (!ativo) return;
    if (rodadas.length > 0 && !confirm('Isso vai regenerar todas as rodadas e apagar os resultados já registrados. Continuar?')) return;
    setErro(null);
    setGerando(true);
    try {
      setRodadas(await api.gerarRodadas(ativo.id));
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível gerar as rodadas');
    } finally {
      setGerando(false);
    }
  }

  function registrarResultado(p: Partida) {
    partidaAtiva.set(p.id);
    navigate('/dashboard/resultado');
  }

  return (
    <OrganizerLayout>
      <div className="p-8 pb-24">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-gray-900 font-bold">Rodadas e Partidas</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              <span className="text-green-600 font-medium">{ativo?.nome}</span>
              {' '}· {rodadas.length} rodadas
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={gerar} disabled={gerando}>
            {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {rodadas.length > 0 ? 'Regerar Rodadas' : 'Gerar Rodadas'}
          </Button>
        </div>

        {erro && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600 mb-6">{erro}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
          </div>
        ) : rodadas.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-sm text-gray-500">
            Nenhuma rodada gerada. Cadastre os times e clique em <span className="font-medium">Gerar Rodadas</span>.
          </div>
        ) : (
          <div className="space-y-8">
            {rodadas.map((round, ri) => (
              <div key={ri}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="px-3 py-1 rounded-full text-sm text-white bg-green-600 font-semibold">
                    {round.titulo}
                  </div>
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs text-gray-400">{round.partidas.length} partidas</span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {round.partidas.map(match => {
                    const data = formatarData(match.dataPartida);
                    return (
                      <div key={match.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-4">
                          <Badge variant="secondary" className={`text-xs shrink-0 ${statusStyle[match.status]}`}>
                            {statusLabel[match.status]}
                          </Badge>

                          <div className="flex-1 flex items-center justify-center gap-6">
                            <div className="flex items-center gap-3 flex-1 justify-end">
                              <span className="text-sm text-gray-900 text-right font-medium">
                                {match.mandante?.nome ?? 'A definir'}
                              </span>
                              <TeamShield size="sm" />
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {match.status === 'CONCLUIDA' && match.golsMandante != null ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="w-9 h-9 rounded-lg bg-gray-900 text-white flex items-center justify-center font-bold text-lg">
                                    {match.golsMandante}
                                  </span>
                                  <span className="text-gray-400 text-xs">×</span>
                                  <span className="w-9 h-9 rounded-lg bg-gray-900 text-white flex items-center justify-center font-bold text-lg">
                                    {match.golsVisitante}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span className="w-9 h-9 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-lg font-bold">–</span>
                                  <span className="text-gray-300 text-xs">×</span>
                                  <span className="w-9 h-9 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-lg font-bold">–</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-3 flex-1">
                              <TeamShield size="sm" />
                              <span className="text-sm text-gray-900 font-medium">
                                {match.visitante?.nome ?? (match.status === 'CONCLUIDA' ? 'Bye' : 'A definir')}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                              {data && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {data}
                                </span>
                              )}
                              {match.local && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {match.local}
                                </span>
                              )}
                            </div>
                            {match.mandante && match.visitante && (
                              <button
                                onClick={() => registrarResultado(match)}
                                className="text-xs px-3 py-1.5 rounded-md text-white flex items-center gap-1 transition-colors bg-green-600 hover:bg-green-700"
                              >
                                {match.status === 'CONCLUIDA' ? 'Editar resultado' : 'Registrar resultado'}
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </OrganizerLayout>
  );
}
