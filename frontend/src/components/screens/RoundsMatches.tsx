import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, ChevronRight, ExternalLink, Loader2, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { OrganizerLayout } from '../OrganizerLayout';
import { TeamShield } from '../TeamShield';
import { api, ApiError, Partida, Rodada } from '../../lib/api';
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

export function RoundsMatches() {
  const navigate = useNavigate();
  const ativo = campeonatoAtivo.get();

  const [rodadas, setRodadas] = useState<Rodada[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!ativo) { navigate('/dashboard'); return; }
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregar() {
    if (!ativo) return;
    setLoading(true);
    try {
      const r = await api.listarPartidas(ativo.id);
      setRodadas(r);
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

  function abrirSumula(p: Partida) {
    partidaAtiva.set(p.id);
    navigate('/dashboard/resultado');
  }

  const total = useMemo(() => rodadas.reduce((a, r) => a + r.partidas.length, 0), [rodadas]);
  const feitas = useMemo(
    () => rodadas.reduce((a, r) => a + r.partidas.filter((p) => p.status === 'CONCLUIDA').length, 0),
    [rodadas],
  );
  const atual = rodadas[idx];

  return (
    <OrganizerLayout>
      <div className="p-10 pb-20 max-w-7xl">
        <div className="flex items-start justify-between gap-6 mb-10">
          <div>
            <p className="text-sm text-muted-foreground">{ativo?.nome}</p>
            <h1 className="font-display text-4xl mt-2">Rodadas</h1>
          </div>
          {ativo && (
            <Button size="sm" variant="outline" onClick={() => navigate(`/campeonato/${ativo.id}`)}>
              <ExternalLink className="h-3.5 w-3.5" /> Ver público
            </Button>
          )}
        </div>

        {erro && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive mb-6">{erro}</div>}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-10"><Loader2 className="h-4 w-4 animate-spin" /> Carregando</div>
        ) : rodadas.length === 0 ? (
          <div className="border border-dashed border-foreground/15 rounded-md p-12 text-center">
            <p className="font-display text-xl mb-2">Nenhuma rodada gerada</p>
            <p className="text-sm text-muted-foreground mb-5">Cadastra os times e a gente monta a tabela de jogos.</p>
            <Button onClick={gerar} disabled={gerando}>
              {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Gerar rodadas
            </Button>
          </div>
        ) : (
          <>
            {/* Barra de rodada */}
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

            {atual && (
              <div className="divide-y divide-border border-y border-border">
                <ListaPartidasAdmin partidas={atual.partidas} onAbrir={abrirSumula} />
              </div>
            )}

            {/* navegador de rodadas em miniatura */}
            <div className="mt-8 flex flex-wrap gap-1">
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
            </div>
          </>
        )}
      </div>
    </OrganizerLayout>
  );
}

function ListaPartidasAdmin({ partidas, onAbrir }: { partidas: Partida[]; onAbrir: (p: Partida) => void }) {
  const temLegs = partidas.some((p) => p.legOrdem != null);
  if (!temLegs) {
    return <>{partidas.map((p) => <LinhaPartida key={p.id} partida={p} onClick={() => onAbrir(p)} />)}</>;
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
          <div>{p.ida ? <LinhaPartida partida={p.ida} onClick={() => onAbrir(p.ida!)} /> : vazio}</div>
          <div>{p.volta ? <LinhaPartida partida={p.volta} onClick={() => onAbrir(p.volta!)} /> : vazio}</div>
        </div>
      ))}
    </>
  );
}

function LinhaPartida({ partida, onClick }: { partida: Partida; onClick: () => void }) {
  const concluida = partida.status === 'CONCLUIDA';
  const emAndamento = partida.status === 'EM_ANDAMENTO';
  return (
    <button onClick={onClick} className="group w-full grid grid-cols-[1fr_auto_1fr_auto] items-center gap-6 py-4 px-2 -mx-2 text-left hover:bg-foreground/[0.02] transition-colors">
      <div className="flex items-center gap-3 justify-end text-right min-w-0">
        <span className="text-sm truncate">{partida.mandante?.nome ?? 'A definir'}</span>
        <TeamShield nome={partida.mandante?.nome} cor={partida.mandante?.cor} abreviacao={partida.mandante?.abreviacao} escudoUrl={partida.mandante?.escudoUrl ?? null} size="sm" />
      </div>
      <div className="w-24 text-center">
        {concluida && partida.golsMandante != null ? (
          <p className="font-scoreboard text-2xl">
            {partida.golsMandante} <span className="text-muted-foreground">–</span> {partida.golsVisitante}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">×</p>
        )}
      </div>
      <div className="flex items-center gap-3 min-w-0">
        <TeamShield nome={partida.visitante?.nome} cor={partida.visitante?.cor} abreviacao={partida.visitante?.abreviacao} escudoUrl={partida.visitante?.escudoUrl ?? null} size="sm" />
        <span className="text-sm truncate">{partida.visitante?.nome ?? 'A definir'}</span>
      </div>
      <div className="text-right text-xs text-muted-foreground min-w-[140px]">
        <p>{formatarDataHora(partida.dataPartida)}</p>
        {partida.local && <p>{partida.local}</p>}
        {emAndamento && <p className="text-brand mt-1">súmula aberta</p>}
      </div>
    </button>
  );
}
