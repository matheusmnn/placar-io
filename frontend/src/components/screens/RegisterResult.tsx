import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, X, ChevronLeft, Target, Square, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { OrganizerLayout } from '../OrganizerLayout';
import { TeamShield } from '../TeamShield';
import { api, ApiError, Jogador, Partida, TipoCartao } from '../../lib/api';
import { partidaAtiva } from '../../lib/session';

interface GolLocal { tempId: number; timeId: number; jogadorId?: number; jogadorNome: string; minuto?: number; }
interface CartaoLocal { tempId: number; timeId: number; jogadorId?: number; jogadorNome: string; tipo: TipoCartao; minuto?: number; }

let seq = 1;

export function RegisterResult() {
  const navigate = useNavigate();
  const partidaId = partidaAtiva.get();

  const [partida, setPartida] = useState<Partida | null>(null);
  const [loading, setLoading] = useState(true);
  const [jogadoresPorTime, setJogadoresPorTime] = useState<Record<number, Jogador[]>>({});

  const [golsMandante, setGolsMandante] = useState(0);
  const [golsVisitante, setGolsVisitante] = useState(0);
  const [gols, setGols] = useState<GolLocal[]>([]);
  const [cartoes, setCartoes] = useState<CartaoLocal[]>([]);

  const [golTime, setGolTime] = useState('');
  const [golJogador, setGolJogador] = useState('');
  const [golMin, setGolMin] = useState('');
  const [cartTime, setCartTime] = useState('');
  const [cartJogador, setCartJogador] = useState('');
  const [cartTipo, setCartTipo] = useState<TipoCartao | ''>('');
  const [cartMin, setCartMin] = useState('');

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!partidaId) { navigate('/dashboard/rodadas'); return; }
    carregar(partidaId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregar(id: number) {
    setLoading(true);
    try {
      const det = await api.obterPartida(id);
      const p = det.partida;
      setPartida(p);
      setGolsMandante(p.golsMandante ?? 0);
      setGolsVisitante(p.golsVisitante ?? 0);
      setGols(det.gols.map(g => ({ tempId: seq++, timeId: g.timeId, jogadorId: g.jogadorId ?? undefined, jogadorNome: g.jogadorNome ?? 'Sem jogador', minuto: g.minuto ?? undefined })));
      setCartoes(det.cartoes.map(c => ({ tempId: seq++, timeId: c.timeId, jogadorId: c.jogadorId ?? undefined, jogadorNome: c.jogadorNome ?? 'Sem jogador', tipo: c.tipo, minuto: c.minuto ?? undefined })));

      const times = [p.mandante, p.visitante].filter((t): t is NonNullable<typeof t> => !!t);
      const mapa: Record<number, Jogador[]> = {};
      await Promise.all(times.map(async t => { mapa[t.id] = await api.listarJogadores(t.id); }));
      setJogadoresPorTime(mapa);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível carregar a partida');
    } finally {
      setLoading(false);
    }
  }

  function nomeTime(id: number): string {
    if (partida?.mandante?.id === id) return partida.mandante.nome;
    if (partida?.visitante?.id === id) return partida?.visitante?.nome ?? '';
    return '';
  }

  function adicionarGol() {
    if (!golTime) return;
    const timeId = Number(golTime);
    const jog = jogadoresPorTime[timeId]?.find(j => String(j.id) === golJogador);
    setGols(prev => [...prev, {
      tempId: seq++, timeId,
      jogadorId: jog?.id,
      jogadorNome: jog?.nome ?? 'Sem jogador',
      minuto: golMin ? Number(golMin) : undefined,
    }]);
    setGolTime(''); setGolJogador(''); setGolMin('');
  }

  function adicionarCartao() {
    if (!cartTime || !cartTipo) return;
    const timeId = Number(cartTime);
    const jog = jogadoresPorTime[timeId]?.find(j => String(j.id) === cartJogador);
    setCartoes(prev => [...prev, {
      tempId: seq++, timeId,
      jogadorId: jog?.id,
      jogadorNome: jog?.nome ?? 'Sem jogador',
      tipo: cartTipo,
      minuto: cartMin ? Number(cartMin) : undefined,
    }]);
    setCartTime(''); setCartJogador(''); setCartTipo(''); setCartMin('');
  }

  async function salvar() {
    if (!partida) return;
    setErro(null);
    setSalvando(true);
    try {
      await api.registrarResultado(partida.id, {
        golsMandante,
        golsVisitante,
        gols: gols.map(g => ({ timeId: g.timeId, jogadorId: g.jogadorId, minuto: g.minuto })),
        cartoes: cartoes.map(c => ({ timeId: c.timeId, jogadorId: c.jogadorId, tipo: c.tipo, minuto: c.minuto })),
      });
      navigate('/dashboard/rodadas');
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível salvar o resultado');
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return (
      <OrganizerLayout>
        <div className="flex items-center justify-center gap-2 py-32 text-gray-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando partida...
        </div>
      </OrganizerLayout>
    );
  }

  if (!partida || !partida.mandante || !partida.visitante) {
    return (
      <OrganizerLayout>
        <div className="p-8 text-sm text-gray-500">Partida inválida. <button className="underline" onClick={() => navigate('/dashboard/rodadas')}>Voltar</button></div>
      </OrganizerLayout>
    );
  }

  const mandante = partida.mandante;
  const visitante = partida.visitante;
  const golForaJogadores = golTime ? (jogadoresPorTime[Number(golTime)] ?? []) : [];
  const cartForaJogadores = cartTime ? (jogadoresPorTime[Number(cartTime)] ?? []) : [];

  return (
    <OrganizerLayout>
      <div className="p-8 pb-24 max-w-3xl">
        <button
          onClick={() => navigate('/dashboard/rodadas')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Rodadas e Partidas
        </button>

        <div className="mb-6">
          <h1 className="text-gray-900 font-bold">Registrar Resultado</h1>
          <p className="text-gray-500 text-sm mt-0.5">{partida.fase ?? `Rodada ${partida.rodada}`}{partida.local ? ` · ${partida.local}` : ''}</p>
        </div>

        {erro && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600 mb-6">{erro}</div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-sm text-gray-700 font-semibold">Placar final</h3>
          </div>
          <div className="p-8">
            <div className="flex items-center justify-center gap-8">
              <div className="flex flex-col items-center gap-3 flex-1">
                <TeamShield size="lg" />
                <p className="text-gray-900 text-center font-semibold">{mandante.nome}</p>
                <p className="text-xs text-gray-400">Casa</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-2">
                  <button onClick={() => setGolsMandante(Math.max(0, golsMandante - 1))} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-lg leading-none transition-colors">−</button>
                  <div className="w-16 h-16 rounded-xl bg-gray-900 text-white flex items-center justify-center text-[2rem] font-bold">{golsMandante}</div>
                  <button onClick={() => setGolsMandante(golsMandante + 1)} className="w-7 h-7 rounded-full flex items-center justify-center text-white text-lg leading-none transition-colors bg-green-600 hover:bg-green-700">+</button>
                </div>

                <span className="text-gray-300 text-2xl font-light">×</span>

                <div className="flex flex-col items-center gap-2">
                  <button onClick={() => setGolsVisitante(Math.max(0, golsVisitante - 1))} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-lg leading-none transition-colors">−</button>
                  <div className="w-16 h-16 rounded-xl bg-gray-900 text-white flex items-center justify-center text-[2rem] font-bold">{golsVisitante}</div>
                  <button onClick={() => setGolsVisitante(golsVisitante + 1)} className="w-7 h-7 rounded-full flex items-center justify-center text-white text-lg leading-none transition-colors bg-green-600 hover:bg-green-700">+</button>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3 flex-1">
                <TeamShield size="lg" />
                <p className="text-gray-900 text-center font-semibold">{visitante.nome}</p>
                <p className="text-xs text-gray-400">Visitante</p>
              </div>
            </div>
            <p className="text-center text-xs text-gray-400 mt-4">
              Se detalhar os gols abaixo, a quantidade por time deve bater com o placar.
            </p>
          </div>
        </div>

        {}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-green-600" />
              <h3 className="text-sm text-gray-700 font-semibold">Gols</h3>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{gols.length} gols</span>
          </div>
          <div className="p-6">
            {gols.length > 0 && (
              <div className="space-y-2 mb-5">
                {gols.map(gol => (
                  <div key={gol.tempId} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                    <Target className="w-3.5 h-3.5 text-green-600 shrink-0" />
                    <span className="text-sm text-green-800 font-medium">{gol.jogadorNome}</span>
                    {gol.minuto != null && <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full ml-auto">{gol.minuto}'</span>}
                    <span className={`text-xs text-gray-400 ${gol.minuto == null ? 'ml-auto' : ''}`}>{nomeTime(gol.timeId)}</span>
                    <button onClick={() => setGols(prev => prev.filter(g => g.tempId !== gol.tempId))} className="p-0.5 text-gray-400 hover:text-red-500 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="border border-dashed border-gray-300 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-3 font-medium">Adicionar gol</p>
              <div className="grid grid-cols-3 gap-3 items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Time</Label>
                  <Select value={golTime} onValueChange={v => { setGolTime(v); setGolJogador(''); }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={String(mandante.id)}>{mandante.nome} (Casa)</SelectItem>
                      <SelectItem value={String(visitante.id)}>{visitante.nome} (Vis.)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Jogador</Label>
                  <Select value={golJogador} onValueChange={setGolJogador} disabled={!golTime}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={golTime ? 'Selecionar...' : 'Escolha o time'} /></SelectTrigger>
                    <SelectContent>
                      {golForaJogadores.map(j => <SelectItem key={j.id} value={String(j.id)}>{j.numero ? `${j.numero} · ` : ''}{j.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-gray-500">Minuto</Label>
                    <Input type="number" placeholder="Ex: 45" className="h-8 text-xs" min={1} max={120} value={golMin} onChange={e => setGolMin(e.target.value)} />
                  </div>
                  <button onClick={adicionarGol} className="h-8 w-8 rounded-md flex items-center justify-center text-white shrink-0 transition-colors bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cartoes */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Square className="w-4 h-4 text-yellow-500" />
              <h3 className="text-sm text-gray-700 font-semibold">Cartões</h3>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{cartoes.length} cartões</span>
          </div>
          <div className="p-6">
            {cartoes.length > 0 && (
              <div className="space-y-2 mb-5">
                {cartoes.map(card => (
                  <div key={card.tempId} className={`flex items-center gap-3 p-3 rounded-lg border ${card.tipo === 'AMARELO' ? 'bg-yellow-50 border-yellow-100' : 'bg-red-50 border-red-100'}`}>
                    <div className={`w-4 h-5 rounded-sm shrink-0 ${card.tipo === 'AMARELO' ? 'bg-yellow-500' : 'bg-red-600'}`} />
                    <span className={`text-sm font-medium ${card.tipo === 'AMARELO' ? 'text-yellow-800' : 'text-red-800'}`}>{card.jogadorNome}</span>
                    {card.minuto != null && <span className={`text-xs px-2 py-0.5 rounded-full ml-auto ${card.tipo === 'AMARELO' ? 'text-yellow-700 bg-yellow-100' : 'text-red-700 bg-red-100'}`}>{card.minuto}'</span>}
                    <span className={`text-xs text-gray-400 ${card.minuto == null ? 'ml-auto' : ''}`}>{nomeTime(card.timeId)}</span>
                    <button onClick={() => setCartoes(prev => prev.filter(c => c.tempId !== card.tempId))} className="p-0.5 text-gray-400 hover:text-red-500 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="border border-dashed border-gray-300 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-3 font-medium">Adicionar cartão</p>
              <div className="grid grid-cols-4 gap-3 items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Time</Label>
                  <Select value={cartTime} onValueChange={v => { setCartTime(v); setCartJogador(''); }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={String(mandante.id)}>{mandante.nome}</SelectItem>
                      <SelectItem value={String(visitante.id)}>{visitante.nome}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Jogador</Label>
                  <Select value={cartJogador} onValueChange={setCartJogador} disabled={!cartTime}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={cartTime ? 'Selecionar...' : 'Escolha o time'} /></SelectTrigger>
                    <SelectContent>
                      {cartForaJogadores.map(j => <SelectItem key={j.id} value={String(j.id)}>{j.numero ? `${j.numero} · ` : ''}{j.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Tipo</Label>
                  <Select value={cartTipo} onValueChange={v => setCartTipo(v as TipoCartao)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AMARELO">Amarelo</SelectItem>
                      <SelectItem value="VERMELHO">Vermelho</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-gray-500">Minuto</Label>
                    <Input type="number" placeholder="Ex: 30" className="h-8 text-xs" min={1} max={120} value={cartMin} onChange={e => setCartMin(e.target.value)} />
                  </div>
                  <button onClick={adicionarCartao} className="h-8 w-8 rounded-md flex items-center justify-center text-white shrink-0 transition-colors bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => navigate('/dashboard/rodadas')} disabled={salvando}>Cancelar</Button>
          <Button
            className="text-white px-8 gap-2 bg-green-600 hover:bg-green-700"
            onClick={salvar}
            disabled={salvando}
          >
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar Resultado
          </Button>
        </div>
      </div>
    </OrganizerLayout>
  );
}
