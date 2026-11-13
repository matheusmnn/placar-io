import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ExternalLink, Loader2, MoreHorizontal, Plus, Shuffle, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { OrganizerLayout } from '../OrganizerLayout';
import { TeamShield } from '../TeamShield';
import { api, ApiError, Campeonato, Partida, Rodada, Time, TimeResumo } from '../../lib/api';
import { campeonatoAtivo, partidaAtiva } from '../../lib/session';

function formatarDataHora(iso: string | null): string {
  if (!iso) return 'A definir';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'A definir';
  const dia = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').slice(0, 3);
  const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const diaCap = dia.charAt(0).toUpperCase() + dia.slice(1);
  return `${diaCap}, ${data} · ${hora}`;
}

function isoParaLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RoundsMatches() {
  const navigate = useNavigate();
  const ativo = campeonatoAtivo.get();

  const [camp, setCamp] = useState<Campeonato | null>(null);
  const [rodadas, setRodadas] = useState<Rodada[]>([]);
  const [times, setTimes] = useState<Time[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [sorteio, setSorteio] = useState<{ tipo: 'tudo' | 'rodada'; rodada?: number } | null>(null);

  const editavel = camp?.formato === 'PONTOS_CORRIDOS';

  function timesOcupados(rodada: number, excetoPartidaId?: number): Set<number> {
    const s = new Set<number>();
    for (const r of rodadas) {
      for (const p of r.partidas) {
        if (p.rodada !== rodada) continue;
        if (p.id === excetoPartidaId) continue;
        if (p.mandante?.id) s.add(p.mandante.id);
        if (p.visitante?.id) s.add(p.visitante.id);
      }
    }
    return s;
  }

  useEffect(() => {
    if (!ativo) { navigate('/dashboard'); return; }
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregar() {
    if (!ativo) return;
    setLoading(true);
    try {
      const [c, r, t] = await Promise.all([
        api.obterCampeonato(ativo.id),
        api.listarPartidas(ativo.id),
        api.listarTimes(ativo.id),
      ]);
      setCamp(c);
      setRodadas(r);
      setTimes(t);
      const aberta = r.findIndex((rd) => rd.partidas.some((p) => p.status !== 'CONCLUIDA'));
      setIdx(Math.max(0, aberta));
    } finally {
      setLoading(false);
    }
  }

  async function gerar() {
    if (!ativo) return;
    if (rodadas.length > 0 && !confirm('Isso vai regerar todas as rodadas e apagar resultados já registrados. Seguir?')) return;
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

  async function gerarChaveVazia() {
    if (!ativo) return;
    setErro(null);
    setGerando(true);
    try {
      await api.gerarChaveManual(ativo.id);
      await carregar();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível criar a chave');
    } finally {
      setGerando(false);
    }
  }

  async function adicionarSlotVazio(rodada: number) {
    if (!ativo) return;
    setErro(null);
    try {
      await api.criarPartida(ativo.id, { rodada });
      await carregar();
      const alvo = rodada - 1;
      if (alvo >= 0 && alvo < rodadas.length + 1) setIdx(alvo);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível criar a partida');
    }
  }

  function abrirSumula(p: Partida) {
    partidaAtiva.set(p.id);
    navigate('/dashboard/resultado');
  }

  function atualizarPartida(id: number, patch: Partial<Partida>) {
    setRodadas((rs) =>
      rs.map((r) => ({
        ...r,
        partidas: r.partidas.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      })),
    );
  }

  async function removerPartida(p: Partida) {
    if (!confirm('Remover esta partida?')) return;
    try {
      await api.removerPartida(p.id);
      await carregar();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível remover');
    }
  }

  async function clonarVolta(rodada: number) {
    if (!ativo) return;
    try {
      const r = await api.clonarRodadaVolta(ativo.id, rodada);
      await carregar();
      setIdx((cur) => Math.min(cur, r.rodada - 1));
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível clonar a rodada');
    }
  }

  async function confirmarSorteio(manter: boolean) {
    if (!ativo || !sorteio) return;
    setErro(null);
    try {
      if (sorteio.tipo === 'tudo') {
        await api.sortearTudo(ativo.id, { reset: !manter });
      } else if (sorteio.rodada != null) {
        await api.sortearRestoRodada(ativo.id, sorteio.rodada, { reset: !manter });
      }
      setSorteio(null);
      await carregar();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Falha ao sortear');
    }
  }


  const maxRodada = useMemo(
    () => rodadas.reduce((m, r) => Math.max(m, ...r.partidas.map((p) => p.rodada)), 0),
    [rodadas],
  );
  const total = useMemo(() => rodadas.reduce((a, r) => a + r.partidas.length, 0), [rodadas]);
  const feitas = useMemo(
    () => rodadas.reduce((a, r) => a + r.partidas.filter((p) => p.status === 'CONCLUIDA').length, 0),
    [rodadas],
  );
  const atual = rodadas[idx];
  const rodadaAtualNumero = atual?.partidas[0]?.rodada ?? idx + 1;
  const temSlotVazioNaRodada = !!atual?.partidas.some((p) => p.status === 'AGENDADA' && (!p.mandante || !p.visitante));

  async function sortearRestantes(rodada: number) {
    if (!ativo) return;
    setErro(null);
    try {
      await api.preencherSlotsVazios(ativo.id, rodada);
      await carregar();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Falha ao sortear restantes');
    }
  }

  return (
    <OrganizerLayout>
      <div className="p-10 pb-20 max-w-7xl">
        <div className="flex items-start justify-between gap-6 mb-10">
          <div>
            <p className="text-sm text-muted-foreground">{ativo?.nome}</p>
            <h1 className="font-display text-4xl mt-2">Rodadas</h1>
          </div>
          <div className="flex items-center gap-2">
            {editavel && rodadas.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setSorteio({ tipo: 'tudo' })}>
                <Shuffle className="h-3.5 w-3.5" /> Sortear tudo
              </Button>
            )}
            {camp?.formato === 'MATA_MATA' && rodadas.length > 0 && (
              <Button size="sm" variant="ghost" onClick={gerar} disabled={gerando}>
                <Shuffle className="h-3.5 w-3.5" /> Sortear tudo
              </Button>
            )}
            {ativo && (
              <Button size="sm" variant="outline" onClick={() => navigate(`/campeonato/${ativo.id}`)}>
                <ExternalLink className="h-3.5 w-3.5" /> Ver público
              </Button>
            )}
          </div>
        </div>

        {erro && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive mb-6">{erro}</div>}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-10"><Loader2 className="h-4 w-4 animate-spin" /> Carregando</div>
        ) : rodadas.length === 0 ? (
          <div className="border border-dashed border-foreground/15 rounded-md p-12 text-center">
            <p className="font-display text-xl mb-2">Nenhuma rodada ainda</p>
            <p className="text-sm text-muted-foreground mb-5">
              {editavel ? 'Gera a tabela automaticamente ou monta rodada por rodada.' : 'Cadastra os times e a gente monta a tabela de jogos.'}
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button onClick={gerar} disabled={gerando}>
                {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
                {camp?.formato === 'MATA_MATA' ? 'Gerar chave aleatória' : 'Gerar rodadas (aleatório)'}
              </Button>
              {camp?.formato === 'MATA_MATA' && (
                <Button variant="outline" onClick={gerarChaveVazia} disabled={gerando}>
                  <Plus className="h-4 w-4" /> Preencher manualmente
                </Button>
              )}
              {editavel && (
                <Button variant="outline" onClick={() => adicionarSlotVazio(1)}>
                  <Plus className="h-4 w-4" /> Criar manualmente
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-y border-border py-5 mb-8">
              <button
                onClick={() => setIdx(Math.max(0, idx - 1))}
                disabled={idx === 0}
                className="h-9 w-9 rounded-md border border-foreground/15 flex items-center justify-center text-foreground/70 disabled:opacity-40 hover:bg-foreground/5"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Rodada</p>
                <p className="font-scoreboard text-3xl mt-1">
                  {String(idx + 1).padStart(2, '0')}<span className="text-muted-foreground"> / {String(rodadas.length).padStart(2, '0')}</span>
                </p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p><span className="font-scoreboard text-foreground">{feitas}</span> de <span className="font-scoreboard">{total}</span></p>
                <p className="text-xs">partidas concluídas</p>
              </div>
              <button
                onClick={() => setIdx(Math.min(rodadas.length - 1, idx + 1))}
                disabled={idx === rodadas.length - 1}
                className="h-9 w-9 rounded-md border border-foreground/15 flex items-center justify-center text-foreground/70 disabled:opacity-40 hover:bg-foreground/5"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {atual && (editavel || temSlotVazioNaRodada) && (
              <div className="flex items-center gap-2 mb-3 text-xs">
                {editavel && (
                  <Button size="sm" variant="outline" onClick={() => adicionarSlotVazio(rodadaAtualNumero)}>
                    <Plus className="h-3.5 w-3.5" /> Adicionar partida
                  </Button>
                )}
                {editavel && (
                  <Button size="sm" variant="ghost" onClick={() => setSorteio({ tipo: 'rodada', rodada: rodadaAtualNumero })}>
                    <Shuffle className="h-3.5 w-3.5" /> Sortear rodada
                  </Button>
                )}
                {temSlotVazioNaRodada && (
                  <Button size="sm" variant="ghost" onClick={() => sortearRestantes(rodadaAtualNumero)}>
                    <Shuffle className="h-3.5 w-3.5" /> Sortear restantes
                  </Button>
                )}
                {editavel && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={atual.partidas.length === 0}
                    onClick={() => clonarVolta(rodadaAtualNumero)}
                    title="Cria uma nova rodada ao final com os mesmos confrontos invertidos"
                  >
                    Duplicar como volta
                  </Button>
                )}
              </div>
            )}

            {atual && camp?.formato === 'MATA_MATA' ? (
              <BracketView
                rodadas={rodadas}
                totalTimes={times.length}
                times={times}
                timesOcupados={timesOcupados}
                onAbrir={abrirSumula}
                onRecarregar={carregar}
              />
            ) : atual ? (
              <div className="divide-y divide-border border-y border-border">
                <ListaPartidasAdmin
                  partidas={atual.partidas}
                  onAbrir={abrirSumula}
                  onAtualizar={atualizarPartida}
                  editavel={!!editavel}
                  times={times}
                  timesOcupados={timesOcupados}
                  onRemover={removerPartida}
                  onRecarregar={carregar}
                />
              </div>
            ) : null}

            {camp?.formato !== 'MATA_MATA' && (
              <div className="mt-8 flex flex-wrap items-center gap-1">
                {rodadas.map((r, i) => {
                  const t = r.partidas.length;
                  const f = r.partidas.filter((p) => p.status === 'CONCLUIDA').length;
                  const estado = f === t ? 'done' : f > 0 ? 'partial' : i === idx ? 'current' : 'empty';
                  return (
                    <button
                      key={i}
                      onClick={() => setIdx(i)}
                      className={`h-8 w-8 rounded-sm text-xs font-scoreboard transition-colors ${
                        estado === 'done' ? 'bg-foreground text-background' :
                        estado === 'partial' ? 'bg-brand text-background' :
                        estado === 'current' ? 'border border-foreground text-foreground' :
                        'border border-border text-muted-foreground hover:border-foreground/30'
                      }`}
                      title={`Rodada ${i + 1}`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
                {editavel && (
                  <button
                    onClick={() => adicionarSlotVazio(maxRodada + 1)}
                    className="h-8 w-8 rounded-sm border border-dashed border-foreground/30 text-foreground/50 hover:border-foreground/60 hover:text-foreground flex items-center justify-center"
                    title="Nova rodada"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {sorteio && (
          <SortearDialog
            tipo={sorteio.tipo}
            rodada={sorteio.rodada}
            personalizadas={
              sorteio.tipo === 'tudo'
                ? rodadas.flatMap((r) => r.partidas).filter((p) => p.status === 'AGENDADA').length
                : (rodadas.flatMap((r) => r.partidas).filter((p) => p.rodada === sorteio.rodada && p.status === 'AGENDADA').length)
            }
            onConfirmar={confirmarSorteio}
            onFechar={() => setSorteio(null)}
          />
        )}

      </div>
    </OrganizerLayout>
  );
}

type TimesOcupadosFn = (rodada: number, excetoPartidaId?: number) => Set<number>;

type ListaProps = {
  partidas: Partida[];
  onAbrir: (p: Partida) => void;
  onAtualizar: (id: number, patch: Partial<Partida>) => void;
  editavel: boolean;
  times: Time[];
  timesOcupados: TimesOcupadosFn;
  onRemover: (p: Partida) => void;
  onRecarregar: () => Promise<void>;
};

function ListaPartidasAdmin({ partidas, onAbrir, onAtualizar, editavel, times, timesOcupados, onRemover, onRecarregar }: ListaProps) {
  const temLegs = partidas.some((p) => p.legOrdem != null);
  if (!temLegs) {
    return (
      <>
        {partidas.map((p) => (
          <LinhaPartida
            key={p.id}
            partida={p}
            onAbrir={() => onAbrir(p)}
            onAtualizar={onAtualizar}
            editavel={editavel}
            times={times}
            timesOcupados={timesOcupados}
            onRemover={() => onRemover(p)}
            onRecarregar={onRecarregar}
          />
        ))}
      </>
    );
  }
  const pares = new Map<number, { ida?: Partida; volta?: Partida }>();
  for (const p of partidas) {
    const k = p.ordemFase ?? 0;
    const a = pares.get(k) ?? {};
    if (p.legOrdem === 2) a.volta = p; else a.ida = p;
    pares.set(k, a);
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
          <div>{p.ida ? <LinhaPartida partida={p.ida} onAbrir={() => onAbrir(p.ida!)} onAtualizar={onAtualizar} editavel={false} times={times} timesOcupados={timesOcupados} onRemover={() => onRemover(p.ida!)} onRecarregar={onRecarregar} /> : vazio}</div>
          <div>{p.volta ? <LinhaPartida partida={p.volta} onAbrir={() => onAbrir(p.volta!)} onAtualizar={onAtualizar} editavel={false} times={times} timesOcupados={timesOcupados} onRemover={() => onRemover(p.volta!)} onRecarregar={onRecarregar} /> : vazio}</div>
        </div>
      ))}
    </>
  );
}

type LinhaProps = {
  partida: Partida;
  onAbrir: () => void;
  onAtualizar: (id: number, patch: Partial<Partida>) => void;
  editavel: boolean;
  times: Time[];
  timesOcupados: TimesOcupadosFn;
  onRemover: () => void;
  onRecarregar: () => Promise<void>;
};

function LinhaPartida({ partida, onAbrir, onAtualizar, editavel, times, timesOcupados, onRemover, onRecarregar }: LinhaProps) {
  const concluida = partida.status === 'CONCLUIDA';
  const emAndamento = partida.status === 'EM_ANDAMENTO';
  const podeEditar = editavel && partida.status === 'AGENDADA';
  const emptyMandante = !partida.mandante;
  const emptyVisitante = !partida.visitante;
  const temVazio = emptyMandante || emptyVisitante;
  const podeMexerSlots = partida.status === 'AGENDADA';
  const clicavel = !temVazio;
  return (
    <div className="group w-full grid grid-cols-[1fr_auto_1fr_auto_auto] items-center gap-6 py-4 px-2 -mx-2 hover:bg-foreground/[0.02] transition-colors">
      <div className="flex items-center gap-3 justify-end text-right min-w-0">
        {emptyMandante && podeMexerSlots ? (
          <SlotPicker partidaId={partida.id} times={times} ocupados={timesOcupados(partida.rodada, partida.id)} lado="mandante" onDone={onRecarregar} />
        ) : (
          <button onClick={clicavel ? onAbrir : undefined} disabled={!clicavel} className="flex items-center gap-3 min-w-0 disabled:cursor-default text-right">
            <span className="text-sm truncate">{partida.mandante?.nome ?? 'A definir'}</span>
            <TeamShield nome={partida.mandante?.nome} cor={partida.mandante?.cor} abreviacao={partida.mandante?.abreviacao} escudoUrl={partida.mandante?.escudoUrl ?? null} size="sm" />
          </button>
        )}
      </div>
      <div className="w-24 text-center">
        {concluida && partida.golsMandante != null ? (
          <button onClick={onAbrir} className="font-scoreboard text-2xl">
            {partida.golsMandante} <span className="text-muted-foreground">–</span> {partida.golsVisitante}
            {partida.penaltisMandante != null && partida.penaltisVisitante != null && (
              <span className="block text-xs text-muted-foreground font-normal">({partida.penaltisMandante}–{partida.penaltisVisitante} pen)</span>
            )}
          </button>
        ) : (
          <button onClick={clicavel ? onAbrir : undefined} disabled={!clicavel} className="text-muted-foreground text-sm disabled:cursor-default">×</button>
        )}
      </div>
      <div className="flex items-center gap-3 min-w-0">
        {emptyVisitante && podeMexerSlots ? (
          <SlotPicker partidaId={partida.id} times={times} ocupados={timesOcupados(partida.rodada, partida.id)} lado="visitante" onDone={onRecarregar} />
        ) : (
          <button onClick={clicavel ? onAbrir : undefined} disabled={!clicavel} className="flex items-center gap-3 min-w-0 disabled:cursor-default">
            <TeamShield nome={partida.visitante?.nome} cor={partida.visitante?.cor} abreviacao={partida.visitante?.abreviacao} escudoUrl={partida.visitante?.escudoUrl ?? null} size="sm" />
            <span className="text-sm truncate">{partida.visitante?.nome ?? 'A definir'}</span>
          </button>
        )}
      </div>
      <div className="text-right text-xs text-muted-foreground min-w-[140px]">
        <EditorDataHora partida={partida} onAtualizar={onAtualizar} />
        {partida.local && <p>{partida.local}</p>}
        {emAndamento && <p className="text-brand mt-1">súmula aberta</p>}
      </div>
      {podeEditar ? (
        <MenuPartida partida={partida} times={times} timesOcupados={timesOcupados} onRemover={onRemover} onRecarregar={onRecarregar} />
      ) : (
        <div className="w-8" />
      )}
    </div>
  );
}

function nextPow2(n: number): number { let p = 1; while (p < n) p *= 2; return p; }
function faseLabelForMatches(timesNaFase: number): string {
  switch (timesNaFase) {
    case 1: case 2: return 'Final';
    case 4: return 'Semifinal';
    case 8: return 'Quartas';
    case 16: return 'Oitavas';
    default: return `${Math.floor(timesNaFase / 2)}-avos`;
  }
}

function BracketView({ rodadas, totalTimes, times, timesOcupados, onAbrir, onRecarregar }: {
  rodadas: Rodada[];
  totalTimes: number;
  times: Time[];
  timesOcupados: TimesOcupadosFn;
  onAbrir: (p: Partida) => void;
  onRecarregar: () => Promise<void>;
}) {
  const size = Math.max(2, nextPow2(totalTimes));
  const totalFases = Math.max(1, Math.log2(size));
  const colunas: { titulo: string; partidas: Partida[]; placeholder?: boolean }[] = [];
  for (let i = 0; i < totalFases; i++) {
    const r = rodadas[i];
    if (r) {
      colunas.push({ titulo: r.titulo, partidas: r.partidas });
    } else {
      const timesNaFase = size / 2 ** i;
      const pares = timesNaFase / 2;
      colunas.push({
        titulo: faseLabelForMatches(timesNaFase),
        partidas: Array.from({ length: pares }).map(() => null as unknown as Partida),
        placeholder: true,
      });
    }
  }

  return (
    <div className="flex gap-6 overflow-x-auto pb-6">
      {colunas.map((col, i) => (
        <div key={i} className="w-60 shrink-0">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-3 text-center">{col.titulo}</p>
          <div className="flex flex-col justify-around" style={{ minHeight: 520 }}>
            {col.partidas.map((p, j) => (
              col.placeholder || !p ? (
                <PlaceholderMatch key={j} />
              ) : (
                <BracketMatch
                  key={p.id}
                  partida={p}
                  times={times}
                  ocupados={timesOcupados(p.rodada, p.id)}
                  onAbrir={() => onAbrir(p)}
                  onRecarregar={onRecarregar}
                />
              )
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BracketMatch({ partida, times, ocupados, onAbrir, onRecarregar }: {
  partida: Partida; times: Time[]; ocupados: Set<number>;
  onAbrir: () => void; onRecarregar: () => Promise<void>;
}) {
  const concluida = partida.status === 'CONCLUIDA';
  const podeMexer = partida.status === 'AGENDADA';
  const clicavel = partida.mandante && partida.visitante;
  return (
    <div className="rounded-md border border-border bg-card my-2 overflow-hidden">
      <BracketSlot
        partidaId={partida.id}
        time={partida.mandante}
        placar={concluida ? partida.golsMandante : null}
        podeMexer={podeMexer}
        lado="mandante"
        times={times}
        ocupados={ocupados}
        onPreenchido={onRecarregar}
        onAbrirSumula={clicavel ? onAbrir : undefined}
      />
      <div className="h-px bg-border" />
      <BracketSlot
        partidaId={partida.id}
        time={partida.visitante}
        placar={concluida ? partida.golsVisitante : null}
        podeMexer={podeMexer}
        lado="visitante"
        times={times}
        ocupados={ocupados}
        onPreenchido={onRecarregar}
        onAbrirSumula={clicavel ? onAbrir : undefined}
      />
      {concluida && partida.penaltisMandante != null && partida.penaltisVisitante != null && (
        <p className="text-[10px] text-muted-foreground text-center py-1 border-t border-border">
          pên {partida.penaltisMandante}–{partida.penaltisVisitante}
        </p>
      )}
    </div>
  );
}

function BracketSlot({ partidaId, time, placar, podeMexer, lado, times, ocupados, onPreenchido, onAbrirSumula }: {
  partidaId: number;
  time: TimeResumo | null;
  placar: number | null;
  podeMexer: boolean;
  lado: 'mandante' | 'visitante';
  times: Time[];
  ocupados: Set<number>;
  onPreenchido: () => Promise<void>;
  onAbrirSumula?: () => void;
}) {
  if (!time && podeMexer) {
    return (
      <div className="px-2 py-2">
        <SlotPicker partidaId={partidaId} times={times} ocupados={ocupados} lado={lado} onDone={onPreenchido} />
      </div>
    );
  }
  return (
    <button
      onClick={onAbrirSumula}
      disabled={!onAbrirSumula}
      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-foreground/[0.03] disabled:cursor-default"
    >
      <span className="flex items-center gap-2 min-w-0">
        {time ? (
          <>
            <TeamShield nome={time.nome} cor={time.cor} abreviacao={time.abreviacao} escudoUrl={time.escudoUrl} size="xs" />
            <span className="truncate">{time.nome}</span>
          </>
        ) : (
          <span className="text-muted-foreground text-xs italic">a definir</span>
        )}
      </span>
      {placar != null && <span className="font-scoreboard">{placar}</span>}
    </button>
  );
}

function PlaceholderMatch() {
  return (
    <div className="rounded-md border border-dashed border-border bg-card/40 my-2 opacity-60">
      <div className="px-3 py-2 text-xs text-muted-foreground italic">a definir</div>
      <div className="h-px bg-border" />
      <div className="px-3 py-2 text-xs text-muted-foreground italic">a definir</div>
    </div>
  );
}

function SlotPicker({ partidaId, times, ocupados, lado, onDone }: {
  partidaId: number; times: Time[]; ocupados: Set<number>;
  lado: 'mandante' | 'visitante';
  onDone: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const disponiveis = times.filter((t) => !ocupados.has(t.id));
  async function escolher(timeId: number) {
    setSalvando(true);
    try {
      await api.atualizarPartida(partidaId, lado === 'mandante' ? { mandanteId: timeId } : { visitanteId: timeId });
      await onDone();
      setOpen(false);
    } finally { setSalvando(false); }
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="h-7 px-2.5 text-xs rounded-md border border-dashed border-foreground/30 text-muted-foreground hover:bg-foreground/5 hover:text-foreground flex items-center gap-1">
          <Plus className="w-3 h-3" /> Escolher time
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2">
        <p className="text-xs text-muted-foreground mb-2 px-1">Escolher {lado}</p>
        {disponiveis.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1 py-2">Nenhum time livre nessa rodada.</p>
        ) : (
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {disponiveis.map((t) => (
              <button
                key={t.id}
                onClick={() => escolher(t.id)}
                disabled={salvando}
                className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-foreground/5 flex items-center gap-2"
              >
                <TeamShield nome={t.nome} cor={t.cor} abreviacao={t.abreviacao} escudoUrl={t.escudoUrl} size="xs" />
                <span className="truncate">{t.nome}</span>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function MenuPartida({ partida, times, timesOcupados, onRemover, onRecarregar }: { partida: Partida; times: Time[]; timesOcupados: TimesOcupadosFn; onRemover: () => void; onRecarregar: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [mandanteId, setMandanteId] = useState<number>(partida.mandante?.id ?? 0);
  const [visitanteId, setVisitanteId] = useState<number>(partida.visitante?.id ?? 0);
  const [rodada, setRodada] = useState<number>(partida.rodada);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const ocupados = timesOcupados(rodada, partida.id);

  async function salvar() {
    setErro(null);
    setSalvando(true);
    try {
      await api.atualizarPartida(partida.id, { mandanteId, visitanteId, rodada });
      await onRecarregar();
      setOpen(false);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Falha ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setMandanteId(partida.mandante?.id ?? 0);
          setVisitanteId(partida.visitante?.id ?? 0);
          setRodada(partida.rodada);
          setErro(null);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button className="h-8 w-8 rounded-sm text-muted-foreground hover:bg-foreground/5 hover:text-foreground flex items-center justify-center" title="Editar partida">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3 space-y-3">
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Mandante</label>
          <select
            value={mandanteId}
            onChange={(e) => setMandanteId(Number(e.target.value))}
            className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value={0} disabled>Selecione</option>
            {times.map((t) => <option key={t.id} value={t.id} disabled={t.id === visitanteId || (ocupados.has(t.id) && t.id !== mandanteId)}>{t.nome}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Visitante</label>
          <select
            value={visitanteId}
            onChange={(e) => setVisitanteId(Number(e.target.value))}
            className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value={0} disabled>Selecione</option>
            {times.map((t) => <option key={t.id} value={t.id} disabled={t.id === mandanteId || (ocupados.has(t.id) && t.id !== visitanteId)}>{t.nome}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Rodada</label>
          <Input type="number" min={1} value={rodada} onChange={(e) => setRodada(Number(e.target.value))} />
        </div>
        {erro && <p className="text-xs text-destructive">{erro}</p>}
        <div className="flex items-center justify-between gap-2 pt-1">
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { setOpen(false); onRemover(); }}>
            <Trash2 className="h-3.5 w-3.5" /> Remover
          </Button>
          <Button size="sm" disabled={salvando || !mandanteId || !visitanteId || mandanteId === visitanteId} onClick={salvar}>
            {salvando ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Salvar'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SortearDialog({
  tipo,
  rodada,
  personalizadas,
  onConfirmar,
  onFechar,
}: {
  tipo: 'tudo' | 'rodada';
  rodada?: number;
  personalizadas: number;
  onConfirmar: (manter: boolean) => Promise<void>;
  onFechar: () => void;
}) {
  const [manter, setManter] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const titulo = tipo === 'tudo' ? 'Sortear tudo' : `Sortear rodada ${rodada}`;
  const descricao = tipo === 'tudo'
    ? 'Preenche os confrontos que faltam em todo o campeonato.'
    : `Preenche os confrontos que faltam na rodada ${rodada}.`;

  async function go() {
    setSalvando(true);
    try { await onConfirmar(manter); } finally { setSalvando(false); }
  }

  return (
    <div className="fixed inset-0 bg-background/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onFechar}>
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-xl">{titulo}</h2>
        <p className="text-sm text-muted-foreground">{descricao}</p>

        {personalizadas > 0 ? (
          <label className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer">
            <Checkbox checked={manter} onCheckedChange={(v) => setManter(v === true)} className="mt-0.5" />
            <span className="text-sm">
              Manter jogos personalizados
              <span className="block text-xs text-muted-foreground mt-0.5">
                {personalizadas} partida{personalizadas > 1 ? 's' : ''} criada{personalizadas > 1 ? 's' : ''} manualmente. Desmarque para apagar e sortear tudo do zero.
              </span>
            </span>
          </label>
        ) : (
          <p className="text-xs text-muted-foreground">Nada personalizado por enquanto — vai sortear tudo do zero.</p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button>
          <Button onClick={go} disabled={salvando}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sortear'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditorDataHora({ partida, onAtualizar }: { partida: Partida; onAtualizar: (id: number, patch: Partial<Partida>) => void }) {
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState(() => isoParaLocal(partida.dataPartida));
  const [salvando, setSalvando] = useState(false);
  const concluida = partida.status === 'CONCLUIDA';

  async function salvar(novo: string | null) {
    setSalvando(true);
    try {
      await api.salvarDadosPartida(partida.id, { dataPartida: novo });
      onAtualizar(partida.id, { dataPartida: novo });
      setOpen(false);
    } catch {
      // mantém popover aberto; usuário vê que não fechou
    } finally {
      setSalvando(false);
    }
  }

  if (concluida) {
    return <p>{formatarDataHora(partida.dataPartida)}</p>;
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setValor(isoParaLocal(partida.dataPartida)); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded px-1 -mx-1 hover:bg-foreground/5 hover:text-foreground"
        >
          <CalendarIcon className="h-3 w-3" />
          <span>{formatarDataHora(partida.dataPartida)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3 space-y-2">
        <p className="text-xs text-muted-foreground">Data e horário da partida</p>
        <Input type="datetime-local" value={valor} onChange={(e) => setValor(e.target.value)} />
        <div className="flex items-center justify-between gap-2 pt-1">
          <Button size="sm" variant="ghost" disabled={salvando || !partida.dataPartida} onClick={() => salvar(null)}>
            Limpar
          </Button>
          <Button size="sm" disabled={salvando || !valor} onClick={() => salvar(new Date(valor).toISOString())}>
            {salvando ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Salvar'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
