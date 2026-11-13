import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Loader2, Flag, Play, Pause, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '../ui/dialog';
import { OrganizerLayout } from '../OrganizerLayout';
import { TeamShield } from '../TeamShield';
import {
  api, ApiError, Jogador, PartidaDetalhe, TimeResumo, TipoCartao,
} from '../../lib/api';
import { partidaAtiva } from '../../lib/session';
import { PenaltisEditor } from '../PenaltisEditor';

type Fase = 'aguardando' | '1T' | 'intervalo' | '2T' | 'pos2T' | 'encerrada';

function faseAtual(det: PartidaDetalhe): Fase {
  const c = det.cronologia;
  if (det.partida.status === 'CONCLUIDA') return 'encerrada';
  if (!c?.inicio1T) return 'aguardando';
  if (!c.termino1T) return '1T';
  if (!c.inicio2T) return 'intervalo';
  if (!c.termino2T) return '2T';
  return 'pos2T';
}

function fmtMMSS(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function LiveMatch() {
  const navigate = useNavigate();
  const partidaId = partidaAtiva.get();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [det, setDet] = useState<PartidaDetalhe | null>(null);
  const [jogMandante, setJogMandante] = useState<Jogador[]>([]);
  const [jogVisitante, setJogVisitante] = useState<Jogador[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [dlg, setDlg] = useState<null | { tipo: 'gol' | 'cartao' | 'sub'; timeId: number }>(null);

  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!partidaId) { navigate('/dashboard/rodadas'); return; }
    recarregar(partidaId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    tickRef.current = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, []);

  async function recarregar(id: number) {
    setLoading(true);
    try {
      const d = await api.obterPartida(id);
      setDet(d);
      const [jm, jv] = await Promise.all([
        d.partida.mandante ? api.listarJogadores(d.partida.mandante.id) : Promise.resolve([]),
        d.partida.visitante ? api.listarJogadores(d.partida.visitante.id) : Promise.resolve([]),
      ]);
      setJogMandante(jm);
      setJogVisitante(jv);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível carregar a partida');
    } finally {
      setLoading(false);
    }
  }

  async function withBusy(fn: () => Promise<unknown>) {
    setErro(null);
    setSalvando(true);
    try {
      await fn();
      if (partidaId) await recarregar(partidaId);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  if (loading || !det || !det.partida.mandante || !det.partida.visitante) {
    return (
      <OrganizerLayout>
        <div className="flex items-center justify-center gap-2 py-32 text-muted-foreground text-sm">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Carregando partida...</> : 'Partida inválida.'}
        </div>
      </OrganizerLayout>
    );
  }

  const partida = det.partida;
  const mandante = partida.mandante!;
  const visitante = partida.visitante!;
  const fase = faseAtual(det);
  const dur1 = det.duracaoPrimeiroTempo;
  const dur2 = det.duracaoSegundoTempo;
  const acr1 = det.cronologia?.acrescimo1T ?? 0;
  const acr2 = det.cronologia?.acrescimo2T ?? 0;

  // Placar derivado dos gols registrados
  const golsMand = det.gols.filter((g) => g.timeId === mandante.id).length;
  const golsVis = det.gols.filter((g) => g.timeId === visitante.id).length;

  // Relógio ao vivo
  const inicio = fase === '1T' ? det.cronologia?.inicio1T : fase === '2T' ? det.cronologia?.inicio2T : null;
  const duracaoCap = (fase === '1T' ? dur1 + acr1 : fase === '2T' ? dur2 + acr2 : 0) * 60;
  const offsetPeriodo = fase === '2T' ? dur1 * 60 : 0;
  const segRodando = inicio ? Math.min(Math.floor((now - new Date(inicio).getTime()) / 1000), duracaoCap) : 0;
  const segTotais = offsetPeriodo + segRodando;
  const minExibido = Math.floor(segTotais / 60) + 1;

  async function iniciar1T() {
    await withBusy(() => api.salvarCronologia(partida.id, { inicio1T: new Date().toISOString() }));
  }
  async function encerrar1T() {
    await withBusy(() => api.salvarCronologia(partida.id, {
      termino1T: new Date().toISOString(),
      placar1TMandante: golsMand,
      placar1TVisitante: golsVis,
    }));
  }
  async function iniciar2T() {
    await withBusy(() => api.salvarCronologia(partida.id, { inicio2T: new Date().toISOString() }));
  }
  async function encerrar2T() {
    await withBusy(() => api.salvarCronologia(partida.id, { termino2T: new Date().toISOString() }));
  }
  async function encerrarPartida() {
    const serie = partida.penaltisSerie ?? [];
    const temPen = serie.length > 0;
    await withBusy(() => api.fecharPlacar(partida.id, {
      golsMandante: golsMand,
      golsVisitante: golsVis,
      penaltisMandante: temPen ? serie.filter((s) => s.time === 'M' && s.converteu).length : null,
      penaltisVisitante: temPen ? serie.filter((s) => s.time === 'V' && s.converteu).length : null,
    }));
  }
  async function atualizarAcrescimo(v: number) {
    const campo = fase === '1T' ? 'acrescimo1T' : 'acrescimo2T';
    await withBusy(() => api.salvarCronologia(partida.id, { [campo]: v }));
  }

  const eventos = useMemo(() => {
    const evs: { id: string; seg: number; label: string; timeNome: string; onDel: () => Promise<unknown> }[] = [];
    for (const g of det.gols) {
      const seg = g.tempoSegundos ?? (g.minuto != null ? g.minuto * 60 : 0);
      const t = g.timeId === mandante.id ? mandante.nome : visitante.nome;
      evs.push({ id: 'g' + g.id, seg, label: `⚽ ${g.jogadorApelido ?? g.jogadorNome ?? 'gol'}`, timeNome: t, onDel: () => api.excluirGol(g.id) });
    }
    for (const c of det.cartoes) {
      const seg = c.tempoSegundos ?? (c.minuto != null ? c.minuto * 60 : 0);
      const t = c.timeId === mandante.id ? mandante.nome : visitante.nome;
      const sym = c.tipo === 'AMARELO' ? '🟨' : '🟥';
      evs.push({ id: 'c' + c.id, seg, label: `${sym} ${c.jogadorApelido ?? c.jogadorNome ?? 'cartão'}`, timeNome: t, onDel: () => api.excluirCartao(c.id) });
    }
    for (const s of det.substituicoes ?? []) {
      const seg = s.tempoSegundos ?? 0;
      const t = s.timeId === mandante.id ? mandante.nome : visitante.nome;
      evs.push({ id: 's' + s.id, seg, label: `🔁 ${s.entrou.nome} ← ${s.saiu.nome}`, timeNome: t, onDel: () => api.excluirSubstituicao(s.id) });
    }
    return evs.sort((a, b) => b.seg - a.seg);
  }, [det.gols, det.cartoes, det.substituicoes, mandante.id, mandante.nome, visitante.id, visitante.nome]);

  const timerLabel = fase === 'aguardando' ? 'Partida agendada'
    : fase === '1T' ? `${fmtMMSS(segRodando)} · 1º tempo`
    : fase === 'intervalo' ? 'Intervalo'
    : fase === '2T' ? `${fmtMMSS(segRodando)} · 2º tempo`
    : fase === 'pos2T' ? 'Fim do 2º tempo · pode ir pra pênaltis ou encerrar'
    : 'Encerrada';

  return (
    <OrganizerLayout>
      <div className="p-6 pb-24 max-w-4xl mx-auto">
        <button onClick={() => navigate('/dashboard/rodadas')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="w-4 h-4" /> Rodadas & jogos
        </button>

        {erro && <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive mb-4">{erro}</div>}

        <div className="rounded-lg border border-border bg-card p-6 mb-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <TeamShield nome={mandante.nome} cor={mandante.cor} abreviacao={mandante.abreviacao} escudoUrl={mandante.escudoUrl} size="xl" />
              <p className="font-semibold">{mandante.nome}</p>
            </div>
            <div className="text-center">
              <p className="font-scoreboard text-6xl leading-none">
                {golsMand} <span className="text-muted-foreground">–</span> {golsVis}
              </p>
              <p className="mt-3 text-sm text-muted-foreground font-mono">{timerLabel}</p>
              {fase === 'intervalo' && det.cronologia?.placar1TMandante != null && (
                <p className="text-xs text-muted-foreground mt-1">1T: {det.cronologia.placar1TMandante} × {det.cronologia.placar1TVisitante}</p>
              )}
              {(fase === '1T' || fase === '2T') && <p className="text-xs text-muted-foreground mt-1">Marcar min. {minExibido}&apos;</p>}
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <TeamShield nome={visitante.nome} cor={visitante.cor} abreviacao={visitante.abreviacao} escudoUrl={visitante.escudoUrl} size="xl" />
              <p className="font-semibold">{visitante.nome}</p>
            </div>
          </div>
        </div>

        {/* Controles de fase */}
        <div className="rounded-lg border border-border bg-card p-4 mb-4 flex flex-wrap items-end gap-3">
          {fase === 'aguardando' && (
            <Button onClick={iniciar1T} disabled={salvando}><Play className="w-4 h-4" /> Iniciar 1º tempo</Button>
          )}
          {fase === '1T' && (
            <>
              <Button onClick={encerrar1T} disabled={salvando} variant="outline"><Pause className="w-4 h-4" /> Encerrar 1º tempo</Button>
              <AcrescimoInput value={acr1} onSave={atualizarAcrescimo} label="Acréscimo 1T (min)" disabled={salvando} />
            </>
          )}
          {fase === 'intervalo' && (
            <Button onClick={iniciar2T} disabled={salvando}><Play className="w-4 h-4" /> Iniciar 2º tempo</Button>
          )}
          {fase === '2T' && (
            <>
              <Button onClick={encerrar2T} disabled={salvando} variant="outline"><Pause className="w-4 h-4" /> Encerrar 2º tempo</Button>
              <AcrescimoInput value={acr2} onSave={atualizarAcrescimo} label="Acréscimo 2T (min)" disabled={salvando} />
            </>
          )}
          {fase === 'pos2T' && (
            <Button onClick={encerrarPartida} disabled={salvando} variant="destructive"><Flag className="w-4 h-4" /> Encerrar partida</Button>
          )}
          {fase === 'encerrada' && (
            <p className="text-sm text-muted-foreground">Partida encerrada. Edite detalhes finos pela súmula.</p>
          )}
        </div>

        {fase === 'pos2T' && partida.mandante && partida.visitante && (
          <div className="rounded-lg border border-border bg-card p-4 mb-4">
            <p className="text-sm font-semibold mb-3">Decisão por pênaltis <span className="text-xs text-muted-foreground font-normal">(opcional)</span></p>
            <PenaltisEditor
              partidaId={partida.id}
              serie={partida.penaltisSerie ?? null}
              mandante={partida.mandante}
              visitante={partida.visitante}
              onSaved={() => partidaId ? recarregar(partidaId) : Promise.resolve()}
            />
          </div>
        )}

        {/* Ações rápidas */}
        {(fase === '1T' || fase === '2T') && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg border border-border bg-card p-3 space-y-2">
              <p className="text-xs text-muted-foreground text-center">{mandante.nome}</p>
              <Button className="w-full" onClick={() => setDlg({ tipo: 'gol', timeId: mandante.id })}>⚽ Gol</Button>
              <Button variant="outline" className="w-full" onClick={() => setDlg({ tipo: 'cartao', timeId: mandante.id })}>🟨 Cartão</Button>
              <Button variant="outline" className="w-full" onClick={() => setDlg({ tipo: 'sub', timeId: mandante.id })}>🔁 Substituição</Button>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 space-y-2">
              <p className="text-xs text-muted-foreground text-center">{visitante.nome}</p>
              <Button className="w-full" onClick={() => setDlg({ tipo: 'gol', timeId: visitante.id })}>⚽ Gol</Button>
              <Button variant="outline" className="w-full" onClick={() => setDlg({ tipo: 'cartao', timeId: visitante.id })}>🟨 Cartão</Button>
              <Button variant="outline" className="w-full" onClick={() => setDlg({ tipo: 'sub', timeId: visitante.id })}>🔁 Substituição</Button>
            </div>
          </div>
        )}

        {/* Lista de eventos */}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-semibold mb-2">Eventos</p>
          {eventos.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum lance registrado.</p>
          ) : (
            <ul className="divide-y divide-border">
              {eventos.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-mono text-xs text-muted-foreground w-12">{fmtMMSS(e.seg)}</span>
                  <span className="flex-1 truncate">{e.label}</span>
                  <span className="text-xs text-muted-foreground mr-2">{e.timeNome}</span>
                  <button onClick={() => withBusy(e.onDel)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {dlg && (
        <LanceDialog
          tipo={dlg.tipo}
          timeId={dlg.timeId}
          mandante={mandante}
          visitante={visitante}
          jogadores={dlg.timeId === mandante.id ? jogMandante : jogVisitante}
          tempoSegundos={segTotais}
          periodoAtual={fase === '2T' ? 'SEGUNDO_TEMPO' : 'PRIMEIRO_TEMPO'}
          partidaId={partida.id}
          onClose={() => setDlg(null)}
          onSaved={async () => { setDlg(null); if (partidaId) await recarregar(partidaId); }}
          setErro={setErro}
        />
      )}
    </OrganizerLayout>
  );
}

function AcrescimoInput({ value, onSave, label, disabled }: { value: number; onSave: (v: number) => Promise<void>; label: string; disabled: boolean }) {
  const [v, setV] = useState(String(value));
  useEffect(() => { setV(String(value)); }, [value]);
  return (
    <div className="space-y-1">
      <Label className="text-xs font-normal text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <Input type="number" min={0} max={30} value={v} onChange={(e) => setV(e.target.value)} className="h-9 w-20 text-sm" disabled={disabled} />
        <Button size="sm" variant="outline" onClick={() => onSave(Number(v) || 0)} disabled={disabled}>Salvar</Button>
      </div>
    </div>
  );
}

function LanceDialog({
  tipo, timeId, mandante, visitante, jogadores, tempoSegundos, periodoAtual, partidaId, onClose, onSaved, setErro,
}: {
  tipo: 'gol' | 'cartao' | 'sub';
  timeId: number;
  mandante: TimeResumo;
  visitante: TimeResumo;
  jogadores: Jogador[];
  tempoSegundos: number;
  periodoAtual: 'PRIMEIRO_TEMPO' | 'SEGUNDO_TEMPO';
  partidaId: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
  setErro: (s: string | null) => void;
}) {
  const timeNome = timeId === mandante.id ? mandante.nome : visitante.nome;
  const [jogadorId, setJogadorId] = useState<string>('');
  const [saiuId, setSaiuId] = useState<string>('');
  const [cartaoTipo, setCartaoTipo] = useState<TipoCartao>('AMARELO');
  const [busy, setBusy] = useState(false);
  const minuto = Math.floor(tempoSegundos / 60);

  async function confirmar() {
    setBusy(true);
    setErro(null);
    try {
      if (tipo === 'gol') {
        await api.criarGol(partidaId, {
          timeId,
          jogadorId: jogadorId ? Number(jogadorId) : null,
          tempoSegundos,
          minuto,
        });
      } else if (tipo === 'cartao') {
        if (!jogadorId) { setErro('Escolha o jogador do cartão'); setBusy(false); return; }
        await api.criarCartao(partidaId, {
          timeId,
          jogadorId: Number(jogadorId),
          tipo: cartaoTipo,
          tempoSegundos,
          minuto,
        });
      } else {
        if (!jogadorId || !saiuId) { setErro('Escolha quem entra e quem sai'); setBusy(false); return; }
        await api.criarSubstituicao(partidaId, {
          timeId,
          periodo: periodoAtual,
          entrouJogadorId: Number(jogadorId),
          saiuJogadorId: Number(saiuId),
          tempoSegundos,
        });
      }
      await onSaved();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao registrar');
    } finally {
      setBusy(false);
    }
  }

  const titulo = tipo === 'gol' ? 'Registrar gol' : tipo === 'cartao' ? 'Registrar cartão' : 'Registrar substituição';

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {timeNome} · {fmtMMSS(tempoSegundos)} · min {minuto + 1}&apos;
          </p>

          {tipo === 'cartao' && (
            <div className="space-y-1">
              <Label className="text-xs font-normal text-muted-foreground">Cartão</Label>
              <Select value={cartaoTipo} onValueChange={(v) => setCartaoTipo(v as TipoCartao)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AMARELO">Amarelo</SelectItem>
                  <SelectItem value="VERMELHO">Vermelho</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs font-normal text-muted-foreground">
              {tipo === 'sub' ? 'Entra' : 'Jogador'}
              {tipo === 'gol' && <span className="ml-1 text-muted-foreground">(opcional)</span>}
            </Label>
            <Select value={jogadorId} onValueChange={setJogadorId}>
              <SelectTrigger><SelectValue placeholder="Selecione o jogador" /></SelectTrigger>
              <SelectContent>
                {jogadores.map((j) => (
                  <SelectItem key={j.id} value={String(j.id)}>
                    {j.numero != null ? `#${j.numero} ` : ''}{j.apelido ?? j.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tipo === 'sub' && (
            <div className="space-y-1">
              <Label className="text-xs font-normal text-muted-foreground">Sai</Label>
              <Select value={saiuId} onValueChange={setSaiuId}>
                <SelectTrigger><SelectValue placeholder="Selecione o jogador" /></SelectTrigger>
                <SelectContent>
                  {jogadores.filter((j) => String(j.id) !== jogadorId).map((j) => (
                    <SelectItem key={j.id} value={String(j.id)}>
                      {j.numero != null ? `#${j.numero} ` : ''}{j.apelido ?? j.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button onClick={confirmar} disabled={busy}><Plus className="w-4 h-4" /> Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
