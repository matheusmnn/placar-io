import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, ExternalLink, Loader2, Pencil, Plus, Trash2, Save, X, Radio } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { OrganizerLayout } from '../OrganizerLayout';
import {
  api, ApiError, ArbitroCampeonato, CampoCustom, CampoCustomValor, CartaoEvento, ComissaoTecnica,
  EscalacaoEntry, FuncaoComissao, GolEvento, Jogador, Partida, PartidaDetalhe, Periodo, StatPartida,
  Substituicao, SumulaConfig, SumulaSecao, TimeResumo, TipoCartao, TipoGol, Cronologia,
  ObservacoesPartida, Arbitragem, subLigada,
} from '../../lib/api';
import { campeonatoAtivo, partidaAtiva } from '../../lib/session';
import { PenaltisEditor } from '../PenaltisEditor';

/* ----------------------------- helpers ---------------------------------- */

const funcaoLabel: Record<FuncaoComissao, string> = {
  TECNICO: 'Técnico',
  ASSISTENTE_TECNICO: 'Assistente técnico',
  MEDICO: 'Médico',
  TREINADOR_GOLEIROS: 'Treinador de goleiros',
  PREPARADOR_FISICO: 'Preparador físico',
  FISIOTERAPEUTA: 'Fisioterapeuta',
  MASSAGISTA: 'Massagista',
};

const tipoGolLabel: Record<TipoGol, string> = {
  NORMAL: 'NR', PENALTI: 'PN', CONTRA: 'CT', FALTA: 'FT',
};

function CBFSection({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden mb-4">
      <div className="px-4 py-2 bg-primary/90 text-primary-foreground flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function AcoesSecao({ onSalvar, onExcluir, confirmLabel = 'esta seção' }: { onSalvar: () => void; onExcluir?: () => void; confirmLabel?: string }) {
  return (
    <div className="flex gap-3">
      {onExcluir && (
        <button
          onClick={() => { if (confirm(`Limpar ${confirmLabel}? Essa ação apaga tudo que foi preenchido aqui.`)) onExcluir(); }}
          className="text-xs underline text-primary-foreground/70 hover:text-primary-foreground"
        >
          Excluir
        </button>
      )}
      <button onClick={onSalvar} className="text-xs underline font-semibold">Salvar</button>
    </div>
  );
}

function fmtMinSeg(seg: number | null | undefined): string {
  if (seg == null) return '—';
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function parseMinSeg(txt: string): number | null {
  if (!txt.trim()) return null;
  const parts = txt.split(':');
  if (parts.length === 1) return Number(parts[0]) * 60; // só minuto
  const m = Number(parts[0]);
  const s = Number(parts[1]);
  if (Number.isNaN(m) || Number.isNaN(s)) return null;
  return m * 60 + s;
}

const CHAVES_STAT: { chave: 'FINALIZACOES' | 'FINALIZACOES_NO_GOL' | 'ESCANTEIOS' | 'FALTAS' | 'IMPEDIMENTOS' | 'POSSE'; label: string }[] = [
  { chave: 'FINALIZACOES', label: 'Finalizações' },
  { chave: 'FINALIZACOES_NO_GOL', label: 'No gol' },
  { chave: 'ESCANTEIOS', label: 'Escanteios' },
  { chave: 'FALTAS', label: 'Faltas' },
  { chave: 'IMPEDIMENTOS', label: 'Impedimentos' },
  { chave: 'POSSE', label: 'Posse (%)' },
];

/* -------------------------------- página -------------------------------- */

export function RegisterResult() {
  const navigate = useNavigate();
  const partidaId = partidaAtiva.get();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [det, setDet] = useState<PartidaDetalhe | null>(null);
  const [jogMandante, setJogMandante] = useState<Jogador[]>([]);
  const [jogVisitante, setJogVisitante] = useState<Jogador[]>([]);
  const [comissaoMandante, setComissaoMandante] = useState<ComissaoTecnica[]>([]);
  const [comissaoVisitante, setComissaoVisitante] = useState<ComissaoTecnica[]>([]);
  const [arbitros, setArbitros] = useState<ArbitroCampeonato[]>([]);

  useEffect(() => {
    if (!partidaId) { navigate('/dashboard/rodadas'); return; }
    recarregar(partidaId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function recarregar(id: number) {
    setLoading(true);
    try {
      const d = await api.obterPartida(id);
      setDet(d);
      const campId = campeonatoAtivo.get()?.id;
      const [jm, jv, cm, cv, ar] = await Promise.all([
        d.partida.mandante ? api.listarJogadores(d.partida.mandante.id) : Promise.resolve([]),
        d.partida.visitante ? api.listarJogadores(d.partida.visitante.id) : Promise.resolve([]),
        d.partida.mandante ? api.listarComissao(d.partida.mandante.id) : Promise.resolve([]),
        d.partida.visitante ? api.listarComissao(d.partida.visitante.id) : Promise.resolve([]),
        campId ? api.listarArbitrosCampeonato(campId) : Promise.resolve([] as ArbitroCampeonato[]),
      ]);
      setJogMandante(jm);
      setJogVisitante(jv);
      setComissaoMandante(cm);
      setComissaoVisitante(cv);
      setArbitros(ar);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível carregar a partida');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <OrganizerLayout>
        <div className="flex items-center justify-center gap-2 py-32 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando partida...
        </div>
      </OrganizerLayout>
    );
  }

  if (!det || !det.partida.mandante || !det.partida.visitante) {
    return (
      <OrganizerLayout>
        <div className="p-8 text-sm text-muted-foreground">
          Partida inválida. <button className="underline" onClick={() => navigate('/dashboard/rodadas')}>Voltar</button>
        </div>
      </OrganizerLayout>
    );
  }

  const partida = det.partida;
  const mandante = partida.mandante!;
  const visitante = partida.visitante!;

  async function withBusy<T>(fn: () => Promise<T>): Promise<T | null> {
    setErro(null);
    setSalvando(true);
    try { return await fn(); }
    catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao salvar');
      return null;
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEDepoisRecarregar<T>(fn: () => Promise<T>) {
    await withBusy(fn);
    if (partidaId) await recarregar(partidaId);
  }

  return (
    <OrganizerLayout>
      <div className="p-6 pb-24 max-w-5xl">
        <button
          onClick={() => navigate('/dashboard/rodadas')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Rodadas & jogos
        </button>

        {erro && (
          <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive mb-4">
            {erro}
          </div>
        )}

        {partida.status !== 'CONCLUIDA' && (
          <button
            onClick={() => navigate('/dashboard/ao-vivo')}
            className="w-full rounded-md border border-brand/40 bg-brand/10 hover:bg-brand/20 text-foreground px-4 py-3 mb-4 flex items-center justify-between text-sm transition-colors"
          >
            <span className="flex items-center gap-2 font-semibold">
              <Radio className="w-4 h-4 text-brand" />
              {partida.status === 'EM_ANDAMENTO' ? 'Voltar pro modo ao vivo' : 'Abrir modo ao vivo'}
            </span>
            <span className="text-xs text-muted-foreground">placar, cronômetro e eventos em tempo real</span>
          </button>
        )}

        <HeaderSumula partida={partida} salvar={salvarEDepoisRecarregar} duracao1T={det.duracaoPrimeiroTempo} duracao2T={det.duracaoSegundoTempo} />

        {secaoLigada('arbitragem', det.sumulaConfig) && <ArbitragemSection
          partidaId={partida.id}
          partida={partida}
          arbitragem={det.arbitragem}
          arbitros={arbitros}
          onSave={() => recarregar(partida.id)}
          salvando={salvando}
          setSalvando={setSalvando}
          setErro={setErro}
          salvar={salvarEDepoisRecarregar}
        />}

        {secaoLigada('cronologia', det.sumulaConfig) && <CronologiaSection
          partidaId={partida.id}
          cronologia={det.cronologia}
          dataPartida={partida.dataPartida}
          cfg={det.sumulaConfig}
          salvar={salvarEDepoisRecarregar}
        />}

        {secaoLigada('escalacao', det.sumulaConfig) && <EscalacaoSection
          partidaId={partida.id}
          mandante={mandante}
          visitante={visitante}
          jogMandante={jogMandante}
          jogVisitante={jogVisitante}
          escalacaoAtual={det.escalacao ?? []}
          cfg={det.sumulaConfig}
          salvar={salvarEDepoisRecarregar}
        />}

        {secaoLigada('escalacao', det.sumulaConfig) && subLigada(det.sumulaConfig, 'escalacao', 'comissao') && <ComissaoBlock mandanteNome={mandante.nome} visitanteNome={visitante.nome}
          mandante={comissaoMandante} visitante={comissaoVisitante} />}

        {secaoLigada('gols', det.sumulaConfig) && <GolsSection
          partidaId={partida.id}
          mandante={mandante}
          visitante={visitante}
          jogMandante={jogMandante}
          jogVisitante={jogVisitante}
          gols={det.gols}
          salvar={salvarEDepoisRecarregar}
        />}

        {secaoLigada('cartoes', det.sumulaConfig) && <CartoesSection
          partidaId={partida.id}
          mandante={mandante}
          visitante={visitante}
          jogMandante={jogMandante}
          jogVisitante={jogVisitante}
          cartoes={det.cartoes}
          salvar={salvarEDepoisRecarregar}
        />}

        {secaoLigada('escalacao', det.sumulaConfig) && subLigada(det.sumulaConfig, 'escalacao', 'substituicoes') && <SubstituicoesSection
          partidaId={partida.id}
          mandante={mandante}
          visitante={visitante}
          jogMandante={jogMandante}
          jogVisitante={jogVisitante}
          substituicoes={det.substituicoes ?? []}
          salvar={salvarEDepoisRecarregar}
        />}

        <StatsSection
          partidaId={partida.id}
          mandanteId={mandante.id}
          visitanteId={visitante.id}
          mandanteNome={mandante.nome}
          visitanteNome={visitante.nome}
          stats={det.stats ?? []}
          salvar={salvarEDepoisRecarregar}
        />

        {secaoLigada('observacoes', det.sumulaConfig) && <ObservacoesSection
          partidaId={partida.id}
          obs={det.observacoes}
          cfg={det.sumulaConfig}
          salvar={salvarEDepoisRecarregar}
        />}

        {det.sumulaConfig.camposCustom.length > 0 && <CamposCustomSection
          partidaId={partida.id}
          campos={det.sumulaConfig.camposCustom}
          valores={partida.camposCustom}
          salvar={salvarEDepoisRecarregar}
        />}

        {secaoLigada('placar', det.sumulaConfig) && <PlacarSection
          partida={partida}
          cronologia={det.cronologia}
          salvando={salvando}
          onPenaltisSaved={() => recarregar(partida.id)}
          salvar1T={async ({ m, v }) => {
            await withBusy(() => api.salvarCronologia(partida.id, {
              placar1TMandante: m,
              placar1TVisitante: v,
            }));
            await recarregar(partida.id);
          }}
          onSalvarFinal={(data) =>
            withBusy(async () => {
              await api.fecharPlacar(partida.id, data);
              navigate('/dashboard/rodadas');
            })
          }
        />}
      </div>
    </OrganizerLayout>
  );
}

function secaoLigada(id: SumulaSecao, cfg: SumulaConfig | undefined): boolean {
  return cfg?.secoes?.[id] !== false;
}

/* ---- Cabeçalho ---- */
function HeaderSumula({ partida, salvar, duracao1T, duracao2T }: { partida: Partida; salvar: (fn: () => Promise<unknown>) => Promise<void>; duracao1T: number; duracao2T: number }) {
  const titulo = partida.fase ?? `Rodada ${partida.rodada}`;
  const [edit, setEdit] = useState(false);
  const toDateInput = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : '');
  const [data, setData] = useState(toDateInput(partida.dataPartida));
  const [local, setLocal] = useState(partida.local ?? '');
  const [transmissao, setTransmissao] = useState(partida.transmissao ?? '');

  async function salvarDados() {
    await salvar(() => api.salvarDadosPartida(partida.id, {
      dataPartida: data ? new Date(data).toISOString() : null,
      local: local.trim() || null,
      transmissao: transmissao.trim() || null,
    }));
    setEdit(false);
  }

  const transmissaoNode = (() => {
    if (!partida.transmissao) return <span className="text-muted-foreground">—</span>;
    const txt = partida.transmissao.trim();
    const ehLink = /^https?:\/\//i.test(txt);
    return ehLink ? (
      <a href={txt} target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4 decoration-foreground/40 hover:decoration-foreground inline-flex items-center gap-1">
        {txt} <ExternalLink className="w-3 h-3" />
      </a>
    ) : (
      <span className="text-foreground">{txt}</span>
    );
  })();

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden mb-4">
      <div className="px-4 py-3 bg-primary/90 text-primary-foreground flex items-center justify-between">
        <h2 className="text-lg font-semibold">Súmula</h2>
        <div className="flex items-center gap-3 text-sm">
          <span>Jogo #{partida.id}</span>
          {!edit ? (
            <button onClick={() => setEdit(true)} className="text-xs underline flex items-center gap-1">
              <Pencil className="w-3 h-3" /> Editar
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { setEdit(false); setData(toDateInput(partida.dataPartida)); setLocal(partida.local ?? ''); setTransmissao(partida.transmissao ?? ''); }} className="text-xs underline">Cancelar</button>
              <button onClick={salvarDados} className="text-xs underline font-semibold">Salvar</button>
            </div>
          )}
        </div>
      </div>
      <div className="p-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Fase</p>
          <p className="text-foreground font-semibold">{titulo}</p>
        </div>
        <div className="col-span-2">
          <p className="text-muted-foreground">Jogo</p>
          <p className="text-foreground font-semibold text-base">
            {partida.mandante?.nome} <span className="text-muted-foreground">×</span> {partida.visitante?.nome}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground mb-1">Data e hora</p>
          {edit ? (
            <Input type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} className="h-8 text-sm" />
          ) : (
            <p className="text-foreground font-semibold">
              {partida.dataPartida
                ? (() => {
                    const dp = new Date(partida.dataPartida);
                    const dia = dp.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').slice(0, 3);
                    const diaCap = dia.charAt(0).toUpperCase() + dia.slice(1);
                    return `${diaCap}, ${dp.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
                  })()
                : <span className="text-muted-foreground">A definir</span>}
            </p>
          )}
        </div>
        <div>
          <p className="text-muted-foreground mb-1">Local</p>
          {edit ? (
            <Input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Campo do Grêmio Vila Nova" className="h-8 text-sm" />
          ) : (
            <p className="text-foreground font-semibold">{partida.local ?? <span className="text-muted-foreground">—</span>}</p>
          )}
        </div>
        <div className="col-span-2">
          <p className="text-muted-foreground mb-1">Transmissão <span className="text-xs">(opcional)</span></p>
          {edit ? (
            <Input value={transmissao} onChange={(e) => setTransmissao(e.target.value)} placeholder='YouTube do canal, ou link https://...' className="h-8 text-sm" />
          ) : transmissaoNode}
        </div>
        <div>
          <p className="text-muted-foreground">Tempo de jogo</p>
          <p className="text-foreground font-semibold">{duracao1T}&apos; + {duracao2T}&apos;</p>
        </div>
      </div>
    </div>
  );
}

/* ---- Arbitragem ---- */
interface ArbRowData { label: string; key: keyof NonNullable<Arbitragem>; emailKey: ArbitragemEmailKey; }
type ArbitragemEmailKey =
  | 'juizEmail' | 'assistente1Email' | 'assistente2Email' | 'quartoArbitroEmail'
  | 'varEmail' | 'avarEmail' | 'avar2Email' | 'observadorVarEmail';

const ARB_ROWS: ArbRowData[] = [
  { label: 'Árbitro', key: 'juiz', emailKey: 'juizEmail' },
  { label: 'Árbitro assistente 1', key: 'assistente1', emailKey: 'assistente1Email' },
  { label: 'Árbitro assistente 2', key: 'assistente2', emailKey: 'assistente2Email' },
  { label: 'Quarto árbitro', key: 'quartoArbitro', emailKey: 'quartoArbitroEmail' },
  { label: 'VAR', key: 'var', emailKey: 'varEmail' },
  { label: 'AVAR', key: 'avar', emailKey: 'avarEmail' },
  { label: 'AVAR 2', key: 'avar2', emailKey: 'avar2Email' },
  { label: 'Observador de VAR', key: 'observadorVar', emailKey: 'observadorVarEmail' },
];

function ArbitragemSection({
  partidaId, partida, arbitragem, arbitros, onSave, salvando, setSalvando, setErro, salvar,
}: {
  partidaId: number;
  partida: Partida;
  arbitragem?: Arbitragem;
  arbitros: ArbitroCampeonato[];
  onSave: () => void;
  salvando: boolean;
  setSalvando: (v: boolean) => void;
  setErro: (v: string | null) => void;
  salvar: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const campId = campeonatoAtivo.get()?.id ?? null;
  const [editando, setEditando] = useState(false);
  const [emails, setEmails] = useState<Record<ArbitragemEmailKey, string>>({
    juizEmail: arbitragem?.juiz?.email ?? '',
    assistente1Email: arbitragem?.assistente1?.email ?? '',
    assistente2Email: arbitragem?.assistente2?.email ?? '',
    quartoArbitroEmail: arbitragem?.quartoArbitro?.email ?? '',
    varEmail: arbitragem?.var?.email ?? '',
    avarEmail: arbitragem?.avar?.email ?? '',
    avar2Email: arbitragem?.avar2?.email ?? '',
    observadorVarEmail: arbitragem?.observadorVar?.email ?? '',
  });
  const [auxEmail, setAuxEmail] = useState('');
  const [convEmail, setConvEmail] = useState('');
  const [convNome, setConvNome] = useState('');
  const ocultos = new Set(partida.camposArbitragemOcultos ?? []);

  async function convidarArbitro() {
    if (!campId || !convEmail.trim()) return;
    try {
      await api.convidarArbitro(campId, { email: convEmail.trim(), nome: convNome.trim() || null });
      setConvEmail(''); setConvNome('');
      onSave();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao convidar árbitro');
    }
  }

  async function esconderCampo(k: string) {
    const nova = Array.from(new Set([...(partida.camposArbitragemOcultos ?? []), k]));
    await salvar(() => api.salvarDadosPartida(partidaId, { camposArbitragemOcultos: nova }));
  }

  async function removerDaPosicao(k: ArbitragemEmailKey) {
    setErro(null);
    setSalvando(true);
    try {
      await api.salvarArbitragem(partidaId, {
        juizEmail: k === 'juizEmail' ? null : (arbitragem?.juiz?.email ?? null),
        assistente1Email: k === 'assistente1Email' ? null : (arbitragem?.assistente1?.email ?? null),
        assistente2Email: k === 'assistente2Email' ? null : (arbitragem?.assistente2?.email ?? null),
        quartoArbitroEmail: k === 'quartoArbitroEmail' ? null : (arbitragem?.quartoArbitro?.email ?? null),
        varEmail: k === 'varEmail' ? null : (arbitragem?.var?.email ?? null),
        avarEmail: k === 'avarEmail' ? null : (arbitragem?.avar?.email ?? null),
        avar2Email: k === 'avar2Email' ? null : (arbitragem?.avar2?.email ?? null),
        observadorVarEmail: k === 'observadorVarEmail' ? null : (arbitragem?.observadorVar?.email ?? null),
      });
      setEmails((e) => ({ ...e, [k]: '' }));
      onSave();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao remover árbitro');
    } finally {
      setSalvando(false);
    }
  }

  async function mostrarTodos() {
    await salvar(() => api.salvarDadosPartida(partidaId, { camposArbitragemOcultos: [] }));
  }

  async function salvarArbitragem() {
    setErro(null);
    setSalvando(true);
    try {
      await api.salvarArbitragem(partidaId, {
        juizEmail: emails.juizEmail || null,
        assistente1Email: emails.assistente1Email || null,
        assistente2Email: emails.assistente2Email || null,
        quartoArbitroEmail: emails.quartoArbitroEmail || null,
        varEmail: emails.varEmail || null,
        avarEmail: emails.avarEmail || null,
        avar2Email: emails.avar2Email || null,
        observadorVarEmail: emails.observadorVarEmail || null,
      });
      setEditando(false);
      onSave();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao salvar arbitragem');
    } finally {
      setSalvando(false);
    }
  }

  async function adicionarAux() {
    if (!auxEmail.trim()) return;
    try {
      await api.adicionarAuxiliar(partidaId, auxEmail.trim());
      setAuxEmail('');
      onSave();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao adicionar auxiliar');
    }
  }

  async function removerAux(usuarioId: number) {
    try {
      await api.removerAuxiliar(partidaId, usuarioId);
      onSave();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao remover auxiliar');
    }
  }

  return (
    <CBFSection title="Arbitragem" right={
      !editando ? (
        <div className="flex gap-3">
          <button
            onClick={async () => {
              if (!confirm('Limpar a arbitragem? Essa ação remove todos os árbitros atribuídos.')) return;
              setErro(null);
              setSalvando(true);
              try {
                await api.salvarArbitragem(partidaId, {
                  juizEmail: null, assistente1Email: null, assistente2Email: null,
                  quartoArbitroEmail: null, varEmail: null, avarEmail: null,
                  avar2Email: null, observadorVarEmail: null,
                });
                setEmails({
                  juizEmail: '', assistente1Email: '', assistente2Email: '',
                  quartoArbitroEmail: '', varEmail: '', avarEmail: '',
                  avar2Email: '', observadorVarEmail: '',
                });
                onSave();
              } catch (err) {
                setErro(err instanceof ApiError ? err.message : 'Erro ao limpar arbitragem');
              } finally {
                setSalvando(false);
              }
            }}
            disabled={salvando}
            className="text-xs underline text-primary-foreground/70 hover:text-primary-foreground"
          >
            Excluir
          </button>
          <button onClick={() => setEditando(true)} className="text-xs underline">Atribuir</button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => setEditando(false)} className="text-xs underline">Cancelar</button>
          <button onClick={salvarArbitragem} disabled={salvando} className="text-xs underline font-semibold">Salvar</button>
        </div>
      )
    }>
      <table className="w-full text-sm">
        <tbody>
          {ARB_ROWS.map((row) => {
            if (ocultos.has(row.emailKey)) return null;
            const user = arbitragem?.[row.key] as { nome: string; email: string } | null | undefined;
            return (
              <tr key={row.emailKey} className="border-b border-border last:border-0">
                <td className="py-1.5 text-muted-foreground w-40">{row.label}</td>
                <td className="py-1.5 text-foreground">
                  {editando ? (
                    <Select
                      value={emails[row.emailKey] || ''}
                      onValueChange={(v) => setEmails({ ...emails, [row.emailKey]: v === '__none__' ? '' : v })}
                    >
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="— Selecionar árbitro —" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {arbitros.map((a) => (
                          <SelectItem key={a.id} value={a.email} disabled={a.status !== 'ACEITO'}>
                            {a.nome ?? a.email} {a.status !== 'ACEITO' && <span className="text-xs text-muted-foreground">(pendente)</span>}
                          </SelectItem>
                        ))}
                        {arbitros.length === 0 && (
                          <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum árbitro cadastrado no campeonato</div>
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    user ? <>{user.nome} <span className="text-muted-foreground text-xs">({user.email})</span></> : <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="w-6 text-right">
                  <button
                    onClick={() => {
                      if (user) {
                        if (!confirm(`Remover ${user.nome} de ${row.label}?`)) return;
                        removerDaPosicao(row.emailKey);
                      } else {
                        if (!confirm(`Esconder "${row.label}" nesta partida?`)) return;
                        esconderCampo(row.emailKey);
                      }
                    }}
                    disabled={salvando}
                    className="text-muted-foreground hover:text-destructive"
                    title={user ? `Remover ${user.nome}` : `Esconder ${row.label}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {ocultos.size > 0 && (
        <p className="mt-2 text-xs">
          <button onClick={mostrarTodos} className="underline text-muted-foreground hover:text-foreground">
            Mostrar todas as posições ({ocultos.size} escondida{ocultos.size > 1 ? 's' : ''})
          </button>
        </p>
      )}

      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground mb-2">Árbitros do campeonato</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {arbitros.map((a) => (
            <span key={a.id} className="inline-flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs">
              {a.nome ?? a.email}
              {a.status !== 'ACEITO' && <span className="text-muted-foreground">(pendente)</span>}
              <button
                onClick={async () => {
                  if (!campId) return;
                  if (!confirm(`Remover ${a.nome ?? a.email} dos árbitros do campeonato?`)) return;
                  try { await api.removerArbitroCampeonato(campId, a.id); onSave(); }
                  catch { /* ignore */ }
                }}
                className="ml-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
          {arbitros.length === 0 && <span className="text-xs text-muted-foreground">Nenhum.</span>}
        </div>
        <div className="flex gap-2 mb-4">
          <Input placeholder="email do árbitro" value={convEmail}
            onChange={(e) => setConvEmail(e.target.value)} className="h-8 text-sm max-w-xs" />
          <Input placeholder="nome (opcional)" value={convNome}
            onChange={(e) => setConvNome(e.target.value)} className="h-8 text-sm max-w-xs" />
          <Button size="sm" onClick={convidarArbitro} variant="outline">Convidar</Button>
        </div>

        <p className="text-xs text-muted-foreground mb-2">Auxiliares da súmula (co-editores desta partida)</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {(arbitragem?.auxiliares ?? []).map((a) => (
            <span key={a.id} className="inline-flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs">
              {a.nome} <span className="text-muted-foreground">({a.email})</span>
              <button onClick={() => removerAux(a.id)} className="ml-1 text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
          {(arbitragem?.auxiliares ?? []).length === 0 && (
            <span className="text-xs text-muted-foreground">Nenhum auxiliar.</span>
          )}
        </div>
        <div className="flex gap-2">
          <Input placeholder="email do auxiliar" value={auxEmail}
            onChange={(e) => setAuxEmail(e.target.value)} className="h-8 text-sm max-w-xs" />
          <Button size="sm" onClick={adicionarAux} variant="outline">Adicionar</Button>
        </div>
      </div>
    </CBFSection>
  );
}

/* ---- Cronologia ---- */
function CronologiaSection({
  partidaId, cronologia, dataPartida, cfg, salvar,
}: {
  partidaId: number; cronologia?: Cronologia; dataPartida: string | null;
  cfg: SumulaConfig;
  salvar: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const mostrarEntradas = subLigada(cfg, 'cronologia', 'entradas');
  const mostrarTempos = subLigada(cfg, 'cronologia', 'tempos');
  if (!mostrarEntradas && !mostrarTempos) return null;
  const toTimeInput = (iso: string | null | undefined) => (iso ? new Date(iso).toISOString().slice(0, 16) : '');
  // Default: usa data do jogo pra todos os horários, assim o adm só mexe no horário
  const defaultDia = toTimeInput(dataPartida);
  const [f, setF] = useState(() => ({
    entradaMandante: toTimeInput(cronologia?.entradaMandante) || defaultDia,
    entradaVisitante: toTimeInput(cronologia?.entradaVisitante) || defaultDia,
    inicio1T: toTimeInput(cronologia?.inicio1T) || defaultDia,
    termino1T: toTimeInput(cronologia?.termino1T) || defaultDia,
    acrescimo1T: cronologia?.acrescimo1T ?? ('' as number | ''),
    inicio2T: toTimeInput(cronologia?.inicio2T) || defaultDia,
    termino2T: toTimeInput(cronologia?.termino2T) || defaultDia,
    acrescimo2T: cronologia?.acrescimo2T ?? ('' as number | ''),
  }));

  const toIso = (v: string) => (v ? new Date(v).toISOString() : null);

  const payload = () => ({
    entradaMandante: toIso(f.entradaMandante),
    entradaVisitante: toIso(f.entradaVisitante),
    inicio1T: toIso(f.inicio1T),
    termino1T: toIso(f.termino1T),
    acrescimo1T: f.acrescimo1T === '' ? null : Number(f.acrescimo1T),
    inicio2T: toIso(f.inicio2T),
    termino2T: toIso(f.termino2T),
    acrescimo2T: f.acrescimo2T === '' ? null : Number(f.acrescimo2T),
  });

  const vazio = {
    entradaMandante: null, entradaVisitante: null,
    inicio1T: null, termino1T: null, acrescimo1T: null,
    inicio2T: null, termino2T: null, acrescimo2T: null,
  };

  return (
    <CBFSection title="Cronologia" right={
      <AcoesSecao
        confirmLabel="a cronologia"
        onSalvar={() => salvar(() => api.salvarCronologia(partidaId, payload()))}
        onExcluir={() => {
          setF({
            entradaMandante: '', entradaVisitante: '',
            inicio1T: '', termino1T: '', acrescimo1T: '',
            inicio2T: '', termino2T: '', acrescimo2T: '',
          });
          salvar(() => api.salvarCronologia(partidaId, vazio));
        }}
      />
    }>
      <div className="grid grid-cols-2 gap-6 text-sm">
        {[{ pre: '1T', lab: '1º Tempo' }, { pre: '2T', lab: '2º Tempo' }].map((t) => (
          <div key={t.pre}>
            <h4 className="text-xs text-muted-foreground mb-2">{t.lab}</h4>
            <div className="space-y-2">
              {mostrarEntradas && <TimeField label="Entrada mandante"
                value={t.pre === '1T' ? f.entradaMandante : ''}
                onChange={t.pre === '1T' ? (v) => setF({ ...f, entradaMandante: v }) : undefined}
                show={t.pre === '1T'} />}
              {mostrarEntradas && <TimeField label="Entrada visitante"
                value={t.pre === '1T' ? f.entradaVisitante : ''}
                onChange={t.pre === '1T' ? (v) => setF({ ...f, entradaVisitante: v }) : undefined}
                show={t.pre === '1T'} />}
              {mostrarTempos && <TimeField label={`Início ${t.pre}`}
                value={t.pre === '1T' ? f.inicio1T : f.inicio2T}
                onChange={(v) => setF({ ...f, [`inicio${t.pre}`]: v } as typeof f)} />}
              {mostrarTempos && <TimeField label={`Término ${t.pre}`}
                value={t.pre === '1T' ? f.termino1T : f.termino2T}
                onChange={(v) => setF({ ...f, [`termino${t.pre}`]: v } as typeof f)} />}
              {mostrarTempos && <IntField label={`Acréscimo ${t.pre} (min)`}
                value={t.pre === '1T' ? f.acrescimo1T : f.acrescimo2T}
                onChange={(v) => setF({ ...f, [`acrescimo${t.pre}`]: v } as typeof f)} />}
            </div>
          </div>
        ))}
      </div>
    </CBFSection>
  );
}

function TimeField({ label, value, onChange, show = true }: { label: string; value: string; onChange?: (v: string) => void; show?: boolean }) {
  if (!show) return null;
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs font-normal text-muted-foreground w-36 shrink-0">{label}</Label>
      <Input type="datetime-local" value={value} onChange={(e) => onChange?.(e.target.value)} className="h-8 text-sm" />
    </div>
  );
}

function IntField({ label, value, onChange }: { label: string; value: number | ''; onChange: (v: number | '') => void }) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs font-normal text-muted-foreground w-36 shrink-0">{label}</Label>
      <Input type="number" min={0} value={value} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className="h-8 text-sm" />
    </div>
  );
}

/* ---- Escalação ---- */
function EscalacaoSection({
  partidaId, mandante, visitante, jogMandante, jogVisitante, escalacaoAtual, cfg, salvar,
}: {
  partidaId: number;
  mandante: TimeResumo;
  visitante: TimeResumo;
  jogMandante: Jogador[];
  jogVisitante: Jogador[];
  escalacaoAtual: EscalacaoEntry[];
  cfg: SumulaConfig;
  salvar: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const mostrarTitulares = subLigada(cfg, 'escalacao', 'titulares');
  const mostrarReservas = subLigada(cfg, 'escalacao', 'reservas');
  if (!mostrarTitulares && !mostrarReservas) return null;
  const [esc, setEsc] = useState<Map<number, 'TITULAR' | 'RESERVA'>>(() => {
    const m = new Map<number, 'TITULAR' | 'RESERVA'>();
    for (const e of escalacaoAtual) m.set(e.jogadorId, e.tipo);
    return m;
  });

  function toggle(jId: number, tipo: 'TITULAR' | 'RESERVA') {
    const next = new Map(esc);
    if (next.get(jId) === tipo) next.delete(jId);
    else next.set(jId, tipo);
    setEsc(next);
  }

  async function salvarEscalacao() {
    const titulares: number[] = [];
    const reservas: number[] = [];
    for (const [jId, tipo] of esc) {
      if (tipo === 'TITULAR') titulares.push(jId);
      else reservas.push(jId);
    }
    await salvar(() => api.salvarEscalacao(partidaId, { titulares, reservas }));
  }

  return (
    <CBFSection title="Relação de Jogadores" right={
      <AcoesSecao
        confirmLabel="a escalação"
        onSalvar={salvarEscalacao}
        onExcluir={() => {
          setEsc(new Map());
          salvar(() => api.salvarEscalacao(partidaId, { titulares: [], reservas: [] }));
        }}
      />
    }>
      <div className="grid grid-cols-2 gap-4">
        {[
          { time: mandante, jogadores: jogMandante },
          { time: visitante, jogadores: jogVisitante },
        ].map(({ time, jogadores }) => (
          <div key={time.id}>
            <h4 className="text-xs text-primary font-bold mb-2">{time.nome}</h4>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left py-1 w-8">Nº</th>
                  <th className="text-left py-1">Jogador</th>
                  {mostrarTitulares && <th className="text-center py-1 w-12">T</th>}
                  {mostrarReservas && <th className="text-center py-1 w-12">R</th>}
                  <th className="w-6"></th>
                </tr>
              </thead>
              <tbody>
                {jogadores.map((j) => (
                  <tr key={j.id} className="border-b border-border last:border-0">
                    <td className="py-1 text-muted-foreground">{j.numero ?? '-'}</td>
                    <td className="py-1 text-foreground">
                      {j.apelido ?? j.nome}
                      {j.posicao === 'GOLEIRO' && <span className="text-muted-foreground"> (g)</span>}
                    </td>
                    {mostrarTitulares && <td className="text-center">
                      <input type="checkbox" checked={esc.get(j.id) === 'TITULAR'}
                        onChange={() => toggle(j.id, 'TITULAR')} className="h-3 w-3 accent-primary" />
                    </td>}
                    {mostrarReservas && <td className="text-center">
                      <input type="checkbox" checked={esc.get(j.id) === 'RESERVA'}
                        onChange={() => toggle(j.id, 'RESERVA')} className="h-3 w-3 accent-primary" />
                    </td>}
                    <td className="text-right">
                      {esc.has(j.id) && (
                        <button
                          onClick={() => {
                            const n = new Map(esc); n.delete(j.id); setEsc(n);
                            const titulares: number[] = [];
                            const reservas: number[] = [];
                            for (const [jId, tipo] of n) {
                              if (tipo === 'TITULAR') titulares.push(jId); else reservas.push(jId);
                            }
                            salvar(() => api.salvarEscalacao(partidaId, { titulares, reservas }));
                          }}
                          className="text-muted-foreground hover:text-destructive"
                          title="Tirar da escalação"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {jogadores.length === 0 && (
                  <tr><td colSpan={3 + (mostrarTitulares ? 1 : 0) + (mostrarReservas ? 1 : 0)} className="py-2 text-center text-muted-foreground">Sem jogadores cadastrados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {mostrarTitulares && 'T = Titular'}{mostrarTitulares && mostrarReservas && ' · '}{mostrarReservas && 'R = Reserva'} · (g) = Goleiro
      </p>
    </CBFSection>
  );
}

/* ---- Comissão técnica (read-only aqui) ---- */
function ComissaoBlock({
  mandanteNome, visitanteNome, mandante, visitante,
}: {
  mandanteNome: string; visitanteNome: string;
  mandante: ComissaoTecnica[]; visitante: ComissaoTecnica[];
}) {
  return (
    <CBFSection title="Comissão Técnica">
      <div className="grid grid-cols-2 gap-4 text-sm">
        {[{ nome: mandanteNome, lista: mandante }, { nome: visitanteNome, lista: visitante }].map((t) => (
          <div key={t.nome}>
            <h4 className="text-xs text-primary font-bold mb-2">{t.nome}</h4>
            {t.lista.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum membro cadastrado.</p>
            ) : (
              <table className="w-full text-xs">
                <tbody>
                  {t.lista.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0">
                      <td className="py-1 text-muted-foreground w-40">{funcaoLabel[c.funcao]}</td>
                      <td className="py-1 text-foreground">{c.nome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Edição no cadastro do time em <strong>Times</strong>.
      </p>
    </CBFSection>
  );
}

/* ---- Gols ---- */
function GolsSection({
  partidaId, mandante, visitante, jogMandante, jogVisitante, gols, salvar,
}: {
  partidaId: number;
  mandante: TimeResumo;
  visitante: TimeResumo;
  jogMandante: Jogador[];
  jogVisitante: Jogador[];
  gols: GolEvento[];
  salvar: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [timeId, setTimeId] = useState<number | ''>('');
  const [jogadorId, setJogadorId] = useState<number | ''>('');
  const [tempo, setTempo] = useState('');
  const [periodo, setPeriodo] = useState<'1T' | '2T'>('1T');
  const [tipo, setTipo] = useState<TipoGol>('NORMAL');

  const jogadores = timeId === mandante.id ? jogMandante : timeId === visitante.id ? jogVisitante : [];

  async function adicionar() {
    if (!timeId) return;
    const segBase = parseMinSeg(tempo);
    const totalSeg = segBase == null ? null : (periodo === '2T' ? segBase + 45 * 60 : segBase);
    await salvar(() => api.criarGol(partidaId, {
      timeId: Number(timeId),
      jogadorId: jogadorId === '' ? null : Number(jogadorId),
      tempoSegundos: totalSeg,
      minuto: totalSeg == null ? null : Math.floor(totalSeg / 60),
      tipo,
    }));
    setTimeId(''); setJogadorId(''); setTempo(''); setTipo('NORMAL');
  }

  return (
    <CBFSection title="Gols">
      {gols.length === 0 ? (
        <p className="text-sm text-muted-foreground mb-3">Nenhum gol registrado.</p>
      ) : (
        <table className="w-full text-xs mb-4">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left py-1 w-16">Tempo</th>
              <th className="text-left py-1 w-12">1T/2T</th>
              <th className="text-left py-1 w-12">Tipo</th>
              <th className="text-left py-1">Jogador</th>
              <th className="text-left py-1">Equipe</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {gols.map((g) => {
              const segBase = g.tempoSegundos ?? (g.minuto != null ? g.minuto * 60 : null);
              const tempoShow = segBase == null ? '—' : fmtMinSeg(segBase % (45 * 60));
              const per = segBase == null ? '—' : (segBase >= 45 * 60 ? '2T' : '1T');
              const nomeEq = g.timeId === mandante.id ? mandante.nome : visitante.nome;
              return (
                <tr key={g.id} className="border-b border-border last:border-0">
                  <td className="py-1">{tempoShow}</td>
                  <td className="py-1">{per}</td>
                  <td className="py-1">{tipoGolLabel[g.tipo ?? 'NORMAL']}</td>
                  <td className="py-1">{g.jogadorApelido ?? g.jogadorNome ?? '—'}</td>
                  <td className="py-1 text-muted-foreground">{nomeEq}</td>
                  <td className="py-1">
                    <button onClick={() => salvar(() => api.excluirGol(g.id))}
                      className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <p className="text-xs text-muted-foreground mb-2">Adicionar gol</p>
      <div className="grid grid-cols-6 gap-2 items-end">
        <div className="col-span-2">
          <Label className="text-xs font-normal text-muted-foreground">Equipe</Label>
          <Select value={timeId === '' ? '' : String(timeId)}
            onValueChange={(v) => { setTimeId(Number(v)); setJogadorId(''); }}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value={String(mandante.id)}>{mandante.nome}</SelectItem>
              <SelectItem value={String(visitante.id)}>{visitante.nome}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label className="text-xs font-normal text-muted-foreground">Jogador</Label>
          <Select value={jogadorId === '' ? '' : String(jogadorId)}
            onValueChange={(v) => setJogadorId(Number(v))} disabled={!timeId}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {jogadores.map((j) => <SelectItem key={j.id} value={String(j.id)}>{j.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-normal text-muted-foreground">Tempo mm:ss</Label>
          <Input value={tempo} onChange={(e) => setTempo(e.target.value)} placeholder="23:10" className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs font-normal text-muted-foreground">Período</Label>
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as '1T' | '2T')}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1T">1T</SelectItem>
              <SelectItem value="2T">2T</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-normal text-muted-foreground">Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as TipoGol)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NORMAL">Normal (NR)</SelectItem>
              <SelectItem value="PENALTI">Pênalti (PN)</SelectItem>
              <SelectItem value="CONTRA">Contra (CT)</SelectItem>
              <SelectItem value="FALTA">Falta (FT)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={adicionar} className="gap-1">
          <Plus className="w-3 h-3" /> Add
        </Button>
      </div>
    </CBFSection>
  );
}

/* ---- Cartões ---- */
function CartoesSection({
  partidaId, mandante, visitante, jogMandante, jogVisitante, cartoes, salvar,
}: {
  partidaId: number;
  mandante: TimeResumo;
  visitante: TimeResumo;
  jogMandante: Jogador[];
  jogVisitante: Jogador[];
  cartoes: CartaoEvento[];
  salvar: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [timeId, setTimeId] = useState<number | ''>('');
  const [jogadorId, setJogadorId] = useState<number | ''>('');
  const [tempo, setTempo] = useState('');
  const [periodo, setPeriodo] = useState<'1T' | '2T'>('1T');
  const [tipo, setTipo] = useState<TipoCartao>('AMARELO');
  const [motivoCodigo, setMotivoCodigo] = useState('');
  const [motivoDescricao, setMotivoDescricao] = useState('');

  const jogadores = timeId === mandante.id ? jogMandante : timeId === visitante.id ? jogVisitante : [];

  async function adicionar() {
    if (!timeId) return;
    const segBase = parseMinSeg(tempo);
    const totalSeg = segBase == null ? null : (periodo === '2T' ? segBase + 45 * 60 : segBase);
    await salvar(() => api.criarCartao(partidaId, {
      timeId: Number(timeId),
      jogadorId: jogadorId === '' ? null : Number(jogadorId),
      tipo,
      tempoSegundos: totalSeg,
      minuto: totalSeg == null ? null : Math.floor(totalSeg / 60),
      motivoCodigo: motivoCodigo || null,
      motivoDescricao: motivoDescricao || null,
    }));
    setTimeId(''); setJogadorId(''); setTempo(''); setMotivoCodigo(''); setMotivoDescricao('');
  }

  const amarelos = cartoes.filter((c) => c.tipo === 'AMARELO');
  const vermelhos = cartoes.filter((c) => c.tipo === 'VERMELHO');

  return (
    <CBFSection title="Cartões">
      {[
        { nome: 'Cartões Amarelos', lista: amarelos, cor: 'bg-yellow-500' },
        { nome: 'Cartões Vermelhos', lista: vermelhos, cor: 'bg-red-600' },
      ].map((bloco) => (
        <div key={bloco.nome} className="mb-3">
          <h4 className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
            <span className={`inline-block w-3 h-4 rounded-sm ${bloco.cor}`} /> {bloco.nome}
          </h4>
          {bloco.lista.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left py-1 w-16">Tempo</th>
                  <th className="text-left py-1 w-12">1T/2T</th>
                  <th className="text-left py-1">Jogador</th>
                  <th className="text-left py-1">Equipe</th>
                  <th className="text-left py-1">Motivo</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {bloco.lista.map((c) => {
                  const segBase = c.tempoSegundos ?? (c.minuto != null ? c.minuto * 60 : null);
                  const tempoShow = segBase == null ? '—' : fmtMinSeg(segBase % (45 * 60));
                  const per = segBase == null ? '—' : (segBase >= 45 * 60 ? '2T' : '1T');
                  const eq = c.timeId === mandante.id ? mandante.nome : visitante.nome;
                  return (
                    <tr key={c.id} className="border-b border-border last:border-0">
                      <td className="py-1">{tempoShow}</td>
                      <td className="py-1">{per}</td>
                      <td className="py-1">{c.jogadorApelido ?? c.jogadorNome ?? '—'}</td>
                      <td className="py-1 text-muted-foreground">{eq}</td>
                      <td className="py-1 text-muted-foreground">
                        {c.motivoCodigo && <span className="font-mono">{c.motivoCodigo}</span>}
                        {c.motivoDescricao && <> · {c.motivoDescricao}</>}
                      </td>
                      <td className="py-1">
                        <button onClick={() => salvar(() => api.excluirCartao(c.id))}
                          className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ))}

      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground mb-2">Adicionar cartão</p>
        <div className="grid grid-cols-6 gap-2 items-end">
          <div className="col-span-2">
            <Label className="text-xs font-normal text-muted-foreground">Equipe</Label>
            <Select value={timeId === '' ? '' : String(timeId)}
              onValueChange={(v) => { setTimeId(Number(v)); setJogadorId(''); }}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value={String(mandante.id)}>{mandante.nome}</SelectItem>
                <SelectItem value={String(visitante.id)}>{visitante.nome}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-xs font-normal text-muted-foreground">Jogador</Label>
            <Select value={jogadorId === '' ? '' : String(jogadorId)}
              onValueChange={(v) => setJogadorId(Number(v))} disabled={!timeId}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {jogadores.map((j) => <SelectItem key={j.id} value={String(j.id)}>{j.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-normal text-muted-foreground">Tempo mm:ss</Label>
            <Input value={tempo} onChange={(e) => setTempo(e.target.value)} placeholder="19:00" className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs font-normal text-muted-foreground">Período</Label>
            <Select value={periodo} onValueChange={(v) => setPeriodo(v as '1T' | '2T')}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1T">1T</SelectItem>
                <SelectItem value="2T">2T</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-normal text-muted-foreground">Cor</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoCartao)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AMARELO">Amarelo</SelectItem>
                <SelectItem value="VERMELHO">Vermelho</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-xs font-normal text-muted-foreground">Motivo (código)</Label>
            <Input value={motivoCodigo} onChange={(e) => setMotivoCodigo(e.target.value)}
              placeholder="A1.3" className="h-8 text-sm" />
          </div>
          <div className="col-span-3">
            <Label className="text-xs font-normal text-muted-foreground">Descrição do motivo</Label>
            <Input value={motivoDescricao} onChange={(e) => setMotivoDescricao(e.target.value)}
              placeholder="Falta tática..." className="h-8 text-sm" />
          </div>
          <Button size="sm" onClick={adicionar} className="gap-1">
            <Plus className="w-3 h-3" /> Add
          </Button>
        </div>
      </div>
    </CBFSection>
  );
}

/* ---- Substituições ---- */
function SubstituicoesSection({
  partidaId, mandante, visitante, jogMandante, jogVisitante, substituicoes, salvar,
}: {
  partidaId: number;
  mandante: TimeResumo;
  visitante: TimeResumo;
  jogMandante: Jogador[];
  jogVisitante: Jogador[];
  substituicoes: Substituicao[];
  salvar: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [timeId, setTimeId] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState<Periodo>('SEGUNDO_TEMPO');
  const [tempo, setTempo] = useState('');
  const [entrouId, setEntrouId] = useState<number | ''>('');
  const [saiuId, setSaiuId] = useState<number | ''>('');

  const jogadores = timeId === mandante.id ? jogMandante : timeId === visitante.id ? jogVisitante : [];

  async function adicionar() {
    if (!timeId || !entrouId || !saiuId) return;
    const segBase = parseMinSeg(tempo);
    const totalSeg = segBase == null ? null : (periodo === 'SEGUNDO_TEMPO' ? segBase + 45 * 60 : segBase);
    await salvar(() => api.criarSubstituicao(partidaId, {
      timeId: Number(timeId),
      periodo,
      entrouJogadorId: Number(entrouId),
      saiuJogadorId: Number(saiuId),
      tempoSegundos: totalSeg,
    }));
    setTimeId(''); setEntrouId(''); setSaiuId(''); setTempo('');
  }

  return (
    <CBFSection title="Substituições">
      {substituicoes.length === 0 ? (
        <p className="text-sm text-muted-foreground mb-3">Nenhuma substituição registrada.</p>
      ) : (
        <table className="w-full text-xs mb-4">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left py-1 w-16">Tempo</th>
              <th className="text-left py-1 w-12">1T/2T</th>
              <th className="text-left py-1">Equipe</th>
              <th className="text-left py-1">Entrou</th>
              <th className="text-left py-1">Saiu</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {substituicoes.map((s) => {
              const seg = s.tempoSegundos;
              const tempoShow = seg == null ? '—' : fmtMinSeg(seg % (45 * 60));
              const per = s.periodo === 'PRIMEIRO_TEMPO' ? '1T' : '2T';
              const eq = s.timeId === mandante.id ? mandante.nome : visitante.nome;
              return (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="py-1">{tempoShow}</td>
                  <td className="py-1">{per}</td>
                  <td className="py-1 text-muted-foreground">{eq}</td>
                  <td className="py-1">{s.entrou.numero ?? '-'} · {s.entrou.nome}</td>
                  <td className="py-1">{s.saiu.numero ?? '-'} · {s.saiu.nome}</td>
                  <td className="py-1">
                    <button onClick={() => salvar(() => api.excluirSubstituicao(s.id))}
                      className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <p className="text-xs text-muted-foreground mb-2">Adicionar substituição</p>
      <div className="grid grid-cols-6 gap-2 items-end">
        <div>
          <Label className="text-xs font-normal text-muted-foreground">Equipe</Label>
          <Select value={timeId === '' ? '' : String(timeId)}
            onValueChange={(v) => { setTimeId(Number(v)); setEntrouId(''); setSaiuId(''); }}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={String(mandante.id)}>{mandante.nome}</SelectItem>
              <SelectItem value={String(visitante.id)}>{visitante.nome}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-normal text-muted-foreground">Tempo mm:ss</Label>
          <Input value={tempo} onChange={(e) => setTempo(e.target.value)} placeholder="22:00" className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs font-normal text-muted-foreground">Período</Label>
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PRIMEIRO_TEMPO">1T</SelectItem>
              <SelectItem value="SEGUNDO_TEMPO">2T</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-normal text-muted-foreground">Entrou</Label>
          <Select value={entrouId === '' ? '' : String(entrouId)}
            onValueChange={(v) => setEntrouId(Number(v))} disabled={!timeId}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {jogadores.map((j) => <SelectItem key={j.id} value={String(j.id)}>{j.numero ?? '-'} {j.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-normal text-muted-foreground">Saiu</Label>
          <Select value={saiuId === '' ? '' : String(saiuId)}
            onValueChange={(v) => setSaiuId(Number(v))} disabled={!timeId}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {jogadores.map((j) => <SelectItem key={j.id} value={String(j.id)}>{j.numero ?? '-'} {j.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={adicionar} className="gap-1">
          <Plus className="w-3 h-3" /> Add
        </Button>
      </div>
    </CBFSection>
  );
}

/* ---- Stats ---- */
function StatsSection({
  partidaId, mandanteId, visitanteId, mandanteNome, visitanteNome, stats, salvar,
}: {
  partidaId: number;
  mandanteId: number; visitanteId: number;
  mandanteNome: string; visitanteNome: string;
  stats: StatPartida[];
  salvar: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  type K = typeof CHAVES_STAT[number]['chave'];
  const inicial = useMemo(() => {
    const m: Record<number, Record<K, number | ''>> = {
      [mandanteId]: Object.fromEntries(CHAVES_STAT.map((c) => [c.chave, ''])) as Record<K, number | ''>,
      [visitanteId]: Object.fromEntries(CHAVES_STAT.map((c) => [c.chave, ''])) as Record<K, number | ''>,
    };
    for (const s of stats) if (m[s.timeId]) m[s.timeId][s.chave] = s.valor;
    return m;
  }, [stats, mandanteId, visitanteId]);
  const [vals, setVals] = useState(inicial);

  async function salvarStats() {
    const payload: { timeId: number; chave: K; valor: number }[] = [];
    for (const timeId of [mandanteId, visitanteId]) {
      for (const { chave } of CHAVES_STAT) {
        const v = vals[timeId][chave];
        if (v !== '' && !Number.isNaN(Number(v))) payload.push({ timeId, chave, valor: Number(v) });
      }
    }
    await salvar(() => api.salvarStats(partidaId, payload));
  }

  function setVal(timeId: number, chave: K, v: string) {
    setVals({
      ...vals,
      [timeId]: { ...vals[timeId], [chave]: v === '' ? '' : Number(v) },
    });
  }

  function excluirLinha(chave: K, label: string) {
    if (!confirm(`Limpar o indicador "${label}" para os dois times?`)) return;
    const next = {
      [mandanteId]: { ...vals[mandanteId], [chave]: '' as number | '' },
      [visitanteId]: { ...vals[visitanteId], [chave]: '' as number | '' },
    };
    setVals(next);
    const payload: { timeId: number; chave: K; valor: number }[] = [];
    for (const timeId of [mandanteId, visitanteId]) {
      for (const { chave: k } of CHAVES_STAT) {
        if (k === chave) continue;
        const v = next[timeId][k];
        if (v !== '' && !Number.isNaN(Number(v))) payload.push({ timeId, chave: k, valor: Number(v) });
      }
    }
    salvar(() => api.salvarStats(partidaId, payload));
  }

  return (
    <CBFSection title="Estatísticas" right={
      <AcoesSecao
        confirmLabel="as estatísticas"
        onSalvar={salvarStats}
        onExcluir={() => {
          const vazio = {
            [mandanteId]: Object.fromEntries(CHAVES_STAT.map((c) => [c.chave, ''])) as Record<K, number | ''>,
            [visitanteId]: Object.fromEntries(CHAVES_STAT.map((c) => [c.chave, ''])) as Record<K, number | ''>,
          };
          setVals(vazio);
          salvar(() => api.salvarStats(partidaId, []));
        }}
      />
    }>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground border-b border-border">
            <th className="text-left py-1">Indicador</th>
            <th className="text-right py-1">{mandanteNome}</th>
            <th className="text-right py-1">{visitanteNome}</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {CHAVES_STAT.map(({ chave, label }) => (
            <tr key={chave} className="border-b border-border last:border-0">
              <td className="py-1 text-muted-foreground">{label}</td>
              <td className="py-1 text-right">
                <Input type="number" min={0} className="h-7 text-sm text-right w-20 ml-auto"
                  value={vals[mandanteId][chave]} onChange={(e) => setVal(mandanteId, chave, e.target.value)} />
              </td>
              <td className="py-1 text-right">
                <Input type="number" min={0} className="h-7 text-sm text-right w-20 ml-auto"
                  value={vals[visitanteId][chave]} onChange={(e) => setVal(visitanteId, chave, e.target.value)} />
              </td>
              <td className="py-1 text-right">
                <button
                  onClick={() => excluirLinha(chave, label)}
                  className="text-muted-foreground hover:text-destructive"
                  title={`Limpar ${label}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </CBFSection>
  );
}

/* ---- Observações ---- */
function ObservacoesSection({
  partidaId, obs, cfg, salvar,
}: {
  partidaId: number;
  obs?: ObservacoesPartida;
  cfg: SumulaConfig;
  salvar: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [v, setV] = useState({
    ocorrencias: obs?.ocorrencias ?? '',
    motivoAtraso: obs?.motivoAtraso ?? '',
    observacoesEventuais: obs?.observacoesEventuais ?? '',
    relatorioAssistente: obs?.relatorioAssistente ?? '',
  });
  const campos = ([
    { key: 'ocorrencias' as const, label: 'Ocorrências / Observações', sub: 'ocorrencias' },
    { key: 'motivoAtraso' as const, label: 'Motivo de atraso e acréscimos', sub: 'motivoAtraso' },
    { key: 'observacoesEventuais' as const, label: 'Observações eventuais', sub: 'observacoesEventuais' },
    { key: 'relatorioAssistente' as const, label: 'Relatório do assistente', sub: 'relatorioAssistente' },
  ]).filter((c) => subLigada(cfg, 'observacoes', c.sub));
  if (campos.length === 0) return null;

  return (
    <CBFSection title="Observações" right={
      <AcoesSecao
        confirmLabel="as observações"
        onSalvar={() => salvar(() => api.salvarObservacoes(partidaId, {
          ocorrencias: v.ocorrencias || null,
          motivoAtraso: v.motivoAtraso || null,
          observacoesEventuais: v.observacoesEventuais || null,
          relatorioAssistente: v.relatorioAssistente || null,
        }))}
        onExcluir={() => {
          setV({ ocorrencias: '', motivoAtraso: '', observacoesEventuais: '', relatorioAssistente: '' });
          salvar(() => api.salvarObservacoes(partidaId, {
            ocorrencias: null, motivoAtraso: null, observacoesEventuais: null, relatorioAssistente: null,
          }));
        }}
      />
    }>
      <div className="grid grid-cols-2 gap-4 text-sm">
        {campos.map((c) => (
          <div key={c.key} className="space-y-1">
            <Label className="text-xs font-normal text-muted-foreground">
              {c.label} <span className="italic">(opcional)</span>
            </Label>
            <textarea rows={3}
              value={v[c.key]}
              onChange={(e) => setV({ ...v, [c.key]: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        ))}
      </div>
    </CBFSection>
  );
}

/* ---- Campos custom (configurados por campeonato) ---- */
function CamposCustomSection({
  partidaId, campos, valores, salvar,
}: {
  partidaId: number;
  campos: CampoCustom[];
  valores: Record<string, CampoCustomValor>;
  salvar: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [v, setV] = useState<Record<string, CampoCustomValor>>(valores ?? {});

  function set(id: string, val: CampoCustomValor) {
    setV((prev) => ({ ...prev, [id]: val }));
  }

  return (
    <CBFSection title="Campos adicionais" right={
      <AcoesSecao
        confirmLabel="os campos adicionais"
        onSalvar={() => salvar(() => api.salvarDadosPartida(partidaId, { camposCustom: v }))}
        onExcluir={() => {
          const vazio: Record<string, CampoCustomValor> = {};
          campos.forEach((c) => { vazio[c.id] = c.tipo === 'boolean' ? false : null; });
          setV(vazio);
          salvar(() => api.salvarDadosPartida(partidaId, { camposCustom: vazio }));
        }}
      />
    }>
      <div className="grid grid-cols-2 gap-4 text-sm">
        {campos.map((c) => (
          <div key={c.id} className="space-y-1">
            <Label className="text-xs font-normal text-muted-foreground">{c.label}</Label>
            {c.tipo === 'boolean' ? (
              <label className="flex items-center gap-2">
                <input type="checkbox"
                  checked={!!v[c.id]}
                  onChange={(e) => set(c.id, e.target.checked)}
                  className="h-4 w-4" />
                <span className="text-sm">Sim</span>
              </label>
            ) : (
              <Input
                type={c.tipo === 'numero' ? 'number' : 'text'}
                value={v[c.id] == null ? '' : String(v[c.id])}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') return set(c.id, null);
                  set(c.id, c.tipo === 'numero' ? Number(raw) : raw);
                }}
              />
            )}
          </div>
        ))}
      </div>
    </CBFSection>
  );
}

/* ---- Placar (1T + final) ---- */
function PlacarContador({ label, valor, onChange }: { label: string; valor: number | null; onChange: (v: number) => void }) {
  const v = valor ?? 0;
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(0, v - 1))}
          className="w-7 h-7 rounded-full bg-muted hover:bg-muted/80 text-foreground">−</button>
        <div className="w-14 h-12 rounded-lg bg-foreground text-background flex items-center justify-center text-2xl font-scoreboard">{v}</div>
        <button onClick={() => onChange(v + 1)}
          className="w-7 h-7 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">+</button>
      </div>
    </div>
  );
}

function PlacarSection({
  partida, cronologia, salvando, salvar1T, onSalvarFinal, onPenaltisSaved,
}: {
  partida: Partida; cronologia?: Cronologia; salvando: boolean;
  salvar1T: (dados: { m: number | null; v: number | null }) => Promise<unknown>;
  onSalvarFinal: (data: {
    golsMandante: number; golsVisitante: number;
    prorrogacao?: boolean;
    golsMandanteProrr?: number | null; golsVisitanteProrr?: number | null;
    penaltisMandante?: number | null; penaltisVisitante?: number | null;
  }) => Promise<unknown>;
  onPenaltisSaved: () => void | Promise<void>;
}) {
  const [gm1, setGm1] = useState<number>(cronologia?.placar1TMandante ?? 0);
  const [gv1, setGv1] = useState<number>(cronologia?.placar1TVisitante ?? 0);
  const [gm, setGm] = useState(partida.golsMandante ?? 0);
  const [gv, setGv] = useState(partida.golsVisitante ?? 0);
  const [prorr, setProrr] = useState(partida.prorrogacao);
  const [prorrGm, setProrrGm] = useState(partida.golsMandanteProrr != null ? String(partida.golsMandanteProrr) : '');
  const [prorrGv, setProrrGv] = useState(partida.golsVisitanteProrr != null ? String(partida.golsVisitanteProrr) : '');
  const [penM, setPenM] = useState(partida.penaltisMandante != null ? String(partida.penaltisMandante) : '');
  const [penV, setPenV] = useState(partida.penaltisVisitante != null ? String(partida.penaltisVisitante) : '');
  const [modoPen, setModoPen] = useState<'resultado' | 'sequencia'>(
    partida.penaltisSerie && partida.penaltisSerie.length > 0 ? 'sequencia' : 'resultado',
  );

  return (
    <CBFSection title="Placar · Fechar súmula" right={
      <div className="flex gap-3">
        <button onClick={() => salvar1T({ m: gm1, v: gv1 })} disabled={salvando} className="text-xs underline">
          Salvar 1º tempo
        </button>
        <Button size="sm" variant="secondary" onClick={() => onSalvarFinal({
          golsMandante: gm,
          golsVisitante: gv,
          prorrogacao: prorr,
          golsMandanteProrr: prorr && prorrGm !== '' ? Number(prorrGm) : null,
          golsVisitanteProrr: prorr && prorrGv !== '' ? Number(prorrGv) : null,
          penaltisMandante: penM !== '' ? Number(penM) : null,
          penaltisVisitante: penV !== '' ? Number(penV) : null,
        })} disabled={salvando} className="gap-1">
          {salvando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Fechar
        </Button>
      </div>
    }>
      <div className="grid grid-cols-2 gap-6">
        {[
          { lab: '1º tempo', m: gm1, v: gv1, setM: setGm1, setV: setGv1 },
          { lab: 'Final',    m: gm,  v: gv,  setM: setGm,  setV: setGv },
        ].map((bloco) => (
          <div key={bloco.lab} className="rounded-md border border-border p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground text-center mb-3">{bloco.lab}</p>
            <div className="flex items-center justify-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground text-center mb-1 truncate">{partida.mandante?.nome}</p>
                <PlacarContador label="mandante" valor={bloco.m} onChange={bloco.setM} />
              </div>
              <span className="text-muted-foreground text-xl">×</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground text-center mb-1 truncate">{partida.visitante?.nome}</p>
                <PlacarContador label="visitante" valor={bloco.v} onChange={bloco.setV} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {partida.fase && (
        <details className="mt-4 pt-4 border-t border-border">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Prorrogação / Pênaltis
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={prorr} onChange={(e) => setProrr(e.target.checked)}
                  className="h-4 w-4 accent-primary" />
                Houve prorrogação
              </label>
              {prorr && (
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" min={0} value={prorrGm} onChange={(e) => setProrrGm(e.target.value)}
                    placeholder="Prorrog. mandante" className="h-8 text-sm" />
                  <Input type="number" min={0} value={prorrGv} onChange={(e) => setProrrGv(e.target.value)}
                    placeholder="Prorrog. visitante" className="h-8 text-sm" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Pênaltis (se foi pra decisão)</p>
                <div className="flex gap-1 text-xs">
                  <button type="button" onClick={() => setModoPen('resultado')} className={`px-2 py-0.5 rounded ${modoPen === 'resultado' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>Só resultado</button>
                  <button type="button" onClick={() => setModoPen('sequencia')} className={`px-2 py-0.5 rounded ${modoPen === 'sequencia' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>Cada cobrança</button>
                </div>
              </div>
              {modoPen === 'resultado' ? (
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" min={0} value={penM} onChange={(e) => setPenM(e.target.value)}
                    placeholder="Pên. mandante" className="h-8 text-sm" />
                  <Input type="number" min={0} value={penV} onChange={(e) => setPenV(e.target.value)}
                    placeholder="Pên. visitante" className="h-8 text-sm" />
                </div>
              ) : partida.mandante && partida.visitante ? (
                <PenaltisEditor
                  partidaId={partida.id}
                  serie={partida.penaltisSerie ?? null}
                  mandante={partida.mandante}
                  visitante={partida.visitante}
                  onSaved={async () => {
                    await onPenaltisSaved();
                    const m = (partida.penaltisSerie ?? []).filter((s) => s.time === 'M' && s.converteu).length;
                    const v = (partida.penaltisSerie ?? []).filter((s) => s.time === 'V' && s.converteu).length;
                    setPenM(String(m));
                    setPenV(String(v));
                  }}
                />
              ) : null}
            </div>
          </div>
        </details>
      )}
    </CBFSection>
  );
}
