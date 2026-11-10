import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Loader2, Plus, Trash2, Save } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { OrganizerLayout } from '../OrganizerLayout';
import {
  api, ApiError, CartaoEvento, ComissaoTecnica, EscalacaoEntry, FuncaoComissao,
  GolEvento, Jogador, Partida, PartidaDetalhe, Periodo, StatPartida,
  Substituicao, TimeResumo, TipoCartao, TipoGol, Cronologia, ObservacoesPartida, Arbitragem,
} from '../../lib/api';
import { partidaAtiva } from '../../lib/session';

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
        <h3 className="text-sm font-semibold uppercase tracking-wide">{title}</h3>
        {right}
      </div>
      <div className="p-4">{children}</div>
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
      const [jm, jv, cm, cv] = await Promise.all([
        d.partida.mandante ? api.listarJogadores(d.partida.mandante.id) : Promise.resolve([]),
        d.partida.visitante ? api.listarJogadores(d.partida.visitante.id) : Promise.resolve([]),
        d.partida.mandante ? api.listarComissao(d.partida.mandante.id) : Promise.resolve([]),
        d.partida.visitante ? api.listarComissao(d.partida.visitante.id) : Promise.resolve([]),
      ]);
      setJogMandante(jm);
      setJogVisitante(jv);
      setComissaoMandante(cm);
      setComissaoVisitante(cv);
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
          <ChevronLeft className="w-4 h-4" /> Rodadas e Partidas
        </button>

        {erro && (
          <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive mb-4">
            {erro}
          </div>
        )}

        <HeaderSumula partida={partida} />

        <ArbitragemSection
          partidaId={partida.id}
          arbitragem={det.arbitragem}
          onSave={() => recarregar(partida.id)}
          salvando={salvando}
          setSalvando={setSalvando}
          setErro={setErro}
        />

        <CronologiaSection
          partidaId={partida.id}
          cronologia={det.cronologia}
          salvar={salvarEDepoisRecarregar}
        />

        <EscalacaoSection
          partidaId={partida.id}
          mandante={mandante}
          visitante={visitante}
          jogMandante={jogMandante}
          jogVisitante={jogVisitante}
          escalacaoAtual={det.escalacao ?? []}
          salvar={salvarEDepoisRecarregar}
        />

        <ComissaoBlock mandanteNome={mandante.nome} visitanteNome={visitante.nome}
          mandante={comissaoMandante} visitante={comissaoVisitante} />

        <GolsSection
          partidaId={partida.id}
          mandante={mandante}
          visitante={visitante}
          jogMandante={jogMandante}
          jogVisitante={jogVisitante}
          gols={det.gols}
          salvar={salvarEDepoisRecarregar}
        />

        <CartoesSection
          partidaId={partida.id}
          mandante={mandante}
          visitante={visitante}
          jogMandante={jogMandante}
          jogVisitante={jogVisitante}
          cartoes={det.cartoes}
          salvar={salvarEDepoisRecarregar}
        />

        <SubstituicoesSection
          partidaId={partida.id}
          mandante={mandante}
          visitante={visitante}
          jogMandante={jogMandante}
          jogVisitante={jogVisitante}
          substituicoes={det.substituicoes ?? []}
          salvar={salvarEDepoisRecarregar}
        />

        <StatsSection
          partidaId={partida.id}
          mandanteId={mandante.id}
          visitanteId={visitante.id}
          mandanteNome={mandante.nome}
          visitanteNome={visitante.nome}
          stats={det.stats ?? []}
          salvar={salvarEDepoisRecarregar}
        />

        <ObservacoesSection
          partidaId={partida.id}
          obs={det.observacoes}
          salvar={salvarEDepoisRecarregar}
        />

        <PlacarFinalSection
          partida={partida}
          salvando={salvando}
          onSalvar={(data) =>
            withBusy(async () => {
              await api.fecharPlacar(partida.id, data);
              navigate('/dashboard/rodadas');
            })
          }
        />
      </div>
    </OrganizerLayout>
  );
}

/* ---- Cabeçalho ---- */
function HeaderSumula({ partida }: { partida: Partida }) {
  const titulo = partida.fase ?? `Rodada ${partida.rodada}`;
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden mb-4">
      <div className="px-4 py-3 bg-primary/90 text-primary-foreground flex items-center justify-between">
        <h2 className="text-lg font-bold">SÚMULA</h2>
        <span className="text-sm">Jogo #{partida.id}</span>
      </div>
      <div className="p-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Fase</p>
          <p className="text-foreground font-semibold">{titulo}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Local</p>
          <p className="text-foreground font-semibold">{partida.local ?? '—'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-muted-foreground">Jogo</p>
          <p className="text-foreground font-semibold text-base">
            {partida.mandante?.nome} <span className="text-muted-foreground">×</span> {partida.visitante?.nome}
          </p>
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
  partidaId, arbitragem, onSave, salvando, setSalvando, setErro,
}: {
  partidaId: number;
  arbitragem?: Arbitragem;
  onSave: () => void;
  salvando: boolean;
  setSalvando: (v: boolean) => void;
  setErro: (v: string | null) => void;
}) {
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

  async function salvar() {
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
        <button onClick={() => setEditando(true)} className="text-xs underline">Atribuir</button>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => setEditando(false)} className="text-xs underline">Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="text-xs underline font-semibold">Salvar</button>
        </div>
      )
    }>
      <table className="w-full text-sm">
        <tbody>
          {ARB_ROWS.map((row) => {
            const user = arbitragem?.[row.key] as { nome: string; email: string } | null | undefined;
            return (
              <tr key={row.emailKey} className="border-b border-border last:border-0">
                <td className="py-1.5 text-muted-foreground w-40">{row.label}</td>
                <td className="py-1.5 text-foreground">
                  {editando ? (
                    <Input
                      placeholder="email@exemplo.com"
                      value={emails[row.emailKey]}
                      onChange={(e) => setEmails({ ...emails, [row.emailKey]: e.target.value })}
                      className="h-8 text-sm"
                    />
                  ) : (
                    user ? <>{user.nome} <span className="text-muted-foreground text-xs">({user.email})</span></> : <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Auxiliares (co-editores)</p>
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
  partidaId, cronologia, salvar,
}: {
  partidaId: number; cronologia?: Cronologia;
  salvar: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const toTimeInput = (iso: string | null | undefined) => (iso ? new Date(iso).toISOString().slice(0, 16) : '');
  const [f, setF] = useState(() => ({
    entradaMandante: toTimeInput(cronologia?.entradaMandante),
    entradaVisitante: toTimeInput(cronologia?.entradaVisitante),
    inicio1T: toTimeInput(cronologia?.inicio1T),
    termino1T: toTimeInput(cronologia?.termino1T),
    acrescimo1T: cronologia?.acrescimo1T ?? ('' as number | ''),
    inicio2T: toTimeInput(cronologia?.inicio2T),
    termino2T: toTimeInput(cronologia?.termino2T),
    acrescimo2T: cronologia?.acrescimo2T ?? ('' as number | ''),
    placar1TMandante: cronologia?.placar1TMandante ?? ('' as number | ''),
    placar1TVisitante: cronologia?.placar1TVisitante ?? ('' as number | ''),
  }));

  const toIso = (v: string) => (v ? new Date(v).toISOString() : null);

  return (
    <CBFSection title="Cronologia" right={
      <button
        onClick={() =>
          salvar(() => api.salvarCronologia(partidaId, {
            entradaMandante: toIso(f.entradaMandante),
            entradaVisitante: toIso(f.entradaVisitante),
            inicio1T: toIso(f.inicio1T),
            termino1T: toIso(f.termino1T),
            acrescimo1T: f.acrescimo1T === '' ? null : Number(f.acrescimo1T),
            inicio2T: toIso(f.inicio2T),
            termino2T: toIso(f.termino2T),
            acrescimo2T: f.acrescimo2T === '' ? null : Number(f.acrescimo2T),
            placar1TMandante: f.placar1TMandante === '' ? null : Number(f.placar1TMandante),
            placar1TVisitante: f.placar1TVisitante === '' ? null : Number(f.placar1TVisitante),
          }))
        }
        className="text-xs underline font-semibold"
      >
        Salvar
      </button>
    }>
      <div className="grid grid-cols-2 gap-6 text-sm">
        {[{ pre: '1T', lab: '1º Tempo' }, { pre: '2T', lab: '2º Tempo' }].map((t) => (
          <div key={t.pre}>
            <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{t.lab}</h4>
            <div className="space-y-2">
              <TimeField label="Entrada mandante"
                value={t.pre === '1T' ? f.entradaMandante : ''}
                onChange={t.pre === '1T' ? (v) => setF({ ...f, entradaMandante: v }) : undefined}
                show={t.pre === '1T'} />
              <TimeField label="Entrada visitante"
                value={t.pre === '1T' ? f.entradaVisitante : ''}
                onChange={t.pre === '1T' ? (v) => setF({ ...f, entradaVisitante: v }) : undefined}
                show={t.pre === '1T'} />
              <TimeField label={`Início ${t.pre}`}
                value={t.pre === '1T' ? f.inicio1T : f.inicio2T}
                onChange={(v) => setF({ ...f, [`inicio${t.pre}`]: v } as typeof f)} />
              <TimeField label={`Término ${t.pre}`}
                value={t.pre === '1T' ? f.termino1T : f.termino2T}
                onChange={(v) => setF({ ...f, [`termino${t.pre}`]: v } as typeof f)} />
              <IntField label={`Acréscimo ${t.pre} (min)`}
                value={t.pre === '1T' ? f.acrescimo1T : f.acrescimo2T}
                onChange={(v) => setF({ ...f, [`acrescimo${t.pre}`]: v } as typeof f)} />
            </div>
          </div>
        ))}
        <div className="col-span-2 grid grid-cols-2 gap-6">
          <IntField label="Placar 1T mandante" value={f.placar1TMandante}
            onChange={(v) => setF({ ...f, placar1TMandante: v })} />
          <IntField label="Placar 1T visitante" value={f.placar1TVisitante}
            onChange={(v) => setF({ ...f, placar1TVisitante: v })} />
        </div>
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
  partidaId, mandante, visitante, jogMandante, jogVisitante, escalacaoAtual, salvar,
}: {
  partidaId: number;
  mandante: TimeResumo;
  visitante: TimeResumo;
  jogMandante: Jogador[];
  jogVisitante: Jogador[];
  escalacaoAtual: EscalacaoEntry[];
  salvar: (fn: () => Promise<unknown>) => Promise<void>;
}) {
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
      <button onClick={salvarEscalacao} className="text-xs underline font-semibold">Salvar</button>
    }>
      <div className="grid grid-cols-2 gap-4">
        {[
          { time: mandante, jogadores: jogMandante },
          { time: visitante, jogadores: jogVisitante },
        ].map(({ time, jogadores }) => (
          <div key={time.id}>
            <h4 className="text-xs uppercase tracking-wide text-primary font-bold mb-2">{time.nome}</h4>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left py-1 w-8">Nº</th>
                  <th className="text-left py-1">Jogador</th>
                  <th className="text-center py-1 w-12">T</th>
                  <th className="text-center py-1 w-12">R</th>
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
                    <td className="text-center">
                      <input type="checkbox" checked={esc.get(j.id) === 'TITULAR'}
                        onChange={() => toggle(j.id, 'TITULAR')} className="h-3 w-3 accent-primary" />
                    </td>
                    <td className="text-center">
                      <input type="checkbox" checked={esc.get(j.id) === 'RESERVA'}
                        onChange={() => toggle(j.id, 'RESERVA')} className="h-3 w-3 accent-primary" />
                    </td>
                  </tr>
                ))}
                {jogadores.length === 0 && (
                  <tr><td colSpan={4} className="py-2 text-center text-muted-foreground">Sem jogadores cadastrados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-2">T = Titular · R = Reserva · (g) = Goleiro</p>
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
            <h4 className="text-xs uppercase tracking-wide text-primary font-bold mb-2">{t.nome}</h4>
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

      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Adicionar gol</p>
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
          <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-2">
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
        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Adicionar cartão</p>
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

      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Adicionar substituição</p>
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

  return (
    <CBFSection title="Estatísticas" right={
      <button onClick={salvarStats} className="text-xs underline font-semibold">Salvar</button>
    }>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground border-b border-border">
            <th className="text-left py-1">Indicador</th>
            <th className="text-right py-1">{mandanteNome}</th>
            <th className="text-right py-1">{visitanteNome}</th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </CBFSection>
  );
}

/* ---- Observações ---- */
function ObservacoesSection({
  partidaId, obs, salvar,
}: {
  partidaId: number;
  obs?: ObservacoesPartida;
  salvar: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [v, setV] = useState({
    ocorrencias: obs?.ocorrencias ?? '',
    motivoAtraso: obs?.motivoAtraso ?? '',
    observacoesEventuais: obs?.observacoesEventuais ?? '',
    relatorioAssistente: obs?.relatorioAssistente ?? '',
  });

  return (
    <CBFSection title="Observações" right={
      <button onClick={() => salvar(() => api.salvarObservacoes(partidaId, {
        ocorrencias: v.ocorrencias || null,
        motivoAtraso: v.motivoAtraso || null,
        observacoesEventuais: v.observacoesEventuais || null,
        relatorioAssistente: v.relatorioAssistente || null,
      }))} className="text-xs underline font-semibold">Salvar</button>
    }>
      <div className="grid grid-cols-2 gap-4 text-sm">
        {[
          { key: 'ocorrencias' as const, label: 'Ocorrências / Observações' },
          { key: 'motivoAtraso' as const, label: 'Motivo de atraso e acréscimos' },
          { key: 'observacoesEventuais' as const, label: 'Observações eventuais' },
          { key: 'relatorioAssistente' as const, label: 'Relatório do assistente' },
        ].map((c) => (
          <div key={c.key} className="space-y-1">
            <Label className="text-xs font-normal text-muted-foreground">{c.label}</Label>
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

/* ---- Placar final (fecha a partida) ---- */
function PlacarFinalSection({
  partida, salvando, onSalvar,
}: {
  partida: Partida; salvando: boolean;
  onSalvar: (data: {
    golsMandante: number; golsVisitante: number;
    prorrogacao?: boolean;
    golsMandanteProrr?: number | null; golsVisitanteProrr?: number | null;
    penaltisMandante?: number | null; penaltisVisitante?: number | null;
  }) => Promise<unknown>;
}) {
  const [gm, setGm] = useState(partida.golsMandante ?? 0);
  const [gv, setGv] = useState(partida.golsVisitante ?? 0);
  const [prorr, setProrr] = useState(partida.prorrogacao);
  const [prorrGm, setProrrGm] = useState(partida.golsMandanteProrr != null ? String(partida.golsMandanteProrr) : '');
  const [prorrGv, setProrrGv] = useState(partida.golsVisitanteProrr != null ? String(partida.golsVisitanteProrr) : '');
  const [penM, setPenM] = useState(partida.penaltisMandante != null ? String(partida.penaltisMandante) : '');
  const [penV, setPenV] = useState(partida.penaltisVisitante != null ? String(partida.penaltisVisitante) : '');

  return (
    <CBFSection title="Placar final · Fechar súmula" right={
      <Button size="sm" variant="secondary" onClick={() => onSalvar({
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
    }>
      <div className="flex items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-1 flex-1">
          <p className="text-foreground text-center font-semibold text-sm">{partida.mandante?.nome}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setGm(Math.max(0, gm - 1))}
              className="w-7 h-7 rounded-full bg-muted hover:bg-muted/80 text-foreground">−</button>
            <div className="w-16 h-14 rounded-lg bg-foreground text-background flex items-center justify-center text-2xl font-bold">{gm}</div>
            <button onClick={() => setGm(gm + 1)}
              className="w-7 h-7 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">+</button>
          </div>
        </div>
        <span className="text-muted-foreground text-xl">×</span>
        <div className="flex flex-col items-center gap-1 flex-1">
          <p className="text-foreground text-center font-semibold text-sm">{partida.visitante?.nome}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setGv(Math.max(0, gv - 1))}
              className="w-7 h-7 rounded-full bg-muted hover:bg-muted/80 text-foreground">−</button>
            <div className="w-16 h-14 rounded-lg bg-foreground text-background flex items-center justify-center text-2xl font-bold">{gv}</div>
            <button onClick={() => setGv(gv + 1)}
              className="w-7 h-7 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">+</button>
          </div>
        </div>
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
              <p className="text-xs text-muted-foreground">Pênaltis (se foi pra decisão)</p>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" min={0} value={penM} onChange={(e) => setPenM(e.target.value)}
                  placeholder="Pên. mandante" className="h-8 text-sm" />
                <Input type="number" min={0} value={penV} onChange={(e) => setPenV(e.target.value)}
                  placeholder="Pên. visitante" className="h-8 text-sm" />
              </div>
            </div>
          </div>
        </details>
      )}
    </CBFSection>
  );
}
