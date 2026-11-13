import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowDown, ArrowUp, ChevronLeft, Loader2, Plus, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { OrganizerLayout } from '../OrganizerLayout';
import { TeamShield } from '../TeamShield';
import { api, ApiError, Campeonato, CriterioDesempate, FaixaTabela, Formato, KoDesempate, PlayoffConfig, Time } from '../../lib/api';

const CRITERIOS_INFO: Record<CriterioDesempate, string> = {
  saldo: 'Saldo de gols',
  golsPro: 'Gols pró',
  golsContra: 'Menos gols sofridos',
  vitorias: 'Mais vitórias',
  confrontoDireto: 'Confronto direto',
  cartoesVermelhos: 'Menos cartões vermelhos',
  cartoesAmarelos: 'Menos cartões amarelos',
  sorteio: 'Sorteio',
};
const CRITERIOS_PADRAO: CriterioDesempate[] = ['saldo', 'golsPro'];

interface FormatoOpcao { value: Formato; label: string; desc: string; grupos?: boolean; temKO?: boolean; playoff?: boolean; }

const FORMATOS: FormatoOpcao[] = [
  { value: 'PONTOS_CORRIDOS', label: 'Pontos corridos', desc: 'Todos se enfrentam. Vence quem somar mais pontos.' },
  { value: 'MATA_MATA', label: 'Mata-mata', desc: 'Eliminação direta.', temKO: true },
  { value: 'GRUPOS', label: 'Grupos', desc: 'Cada grupo joga por si.', grupos: true },
  { value: 'GRUPOS_MATA_MATA', label: 'Grupos + mata-mata', desc: 'Grupos classificam pro mata-mata.', grupos: true, temKO: true },
  { value: 'PONTOS_CORRIDOS_MATA_MATA', label: 'Pontos corridos + playoff', desc: 'Liga regular + playoff no fim.', temKO: true, playoff: true },
];

const PLAYOFF_TEMPLATES: Record<string, { label: string; cfg: PlayoffConfig }> = {
  topQuatro: {
    label: 'Top 4 (1×4, 2×3, final)',
    cfg: { posicoes: [1, 2, 3, 4], chaveamento: [[1, 4], [2, 3]], temFinal: true, idaVolta: false, desempate: 'PENALTIS' },
  },
  acessoSerieB: {
    label: 'Acesso Série B (3×6, 4×5, sem final)',
    cfg: { posicoes: [3, 4, 5, 6], chaveamento: [[3, 6], [4, 5]], temFinal: false, idaVolta: false, desempate: 'PENALTIS' },
  },
  eflChampionship: {
    label: 'EFL Championship (3×6, 4×5, final única)',
    cfg: { posicoes: [3, 4, 5, 6], chaveamento: [[3, 6], [4, 5]], temFinal: true, idaVolta: true, desempate: 'PRORROGACAO_PENALTIS' },
  },
};

const CORES_FAIXA = [
  { nome: 'Verde', hex: '#4a7a3e' },
  { nome: 'Azul', hex: '#14213d' },
  { nome: 'Amarelo', hex: '#b8871e' },
  { nome: 'Laranja', hex: '#c84b1c' },
  { nome: 'Vermelho', hex: '#a93326' },
  { nome: 'Cinza', hex: '#6a6355' },
];

export function CreateChampionship() {
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id?: string }>();
  const editandoId = idParam ? Number(idParam) : null;
  const editando = editandoId !== null;
  const [formato, setFormato] = useState<Formato>('PONTOS_CORRIDOS');
  const [nome, setNome] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [pontosVitoria, setPontosVitoria] = useState(3);
  const [pontosEmpate, setPontosEmpate] = useState(1);
  const [idaVolta, setIdaVolta] = useState(false);
  const [koDesempate, setKoDesempate] = useState<KoDesempate>('PENALTIS');
  const [duracao1T, setDuracao1T] = useState(45);
  const [duracao2T, setDuracao2T] = useState(45);
  const [numGrupos, setNumGrupos] = useState(4);
  const [avancamPorGrupo, setAvancamPorGrupo] = useState(2);
  const [playoffTemplate, setPlayoffTemplate] = useState<keyof typeof PLAYOFF_TEMPLATES>('topQuatro');
  const [criterios, setCriterios] = useState<CriterioDesempate[]>(CRITERIOS_PADRAO);
  const [descricao, setDescricao] = useState('');
  const [vinculadoId, setVinculadoId] = useState<string>('nenhum');
  const [faixas, setFaixas] = useState<FaixaTabela[]>([]);
  const [outros, setOutros] = useState<Campeonato[]>([]);
  const [meusTimes, setMeusTimes] = useState<Time[]>([]);
  const [timesSelecionados, setTimesSelecionados] = useState<Set<number>>(new Set());
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.listarCampeonatos().then((r) => setOutros(r.campeonatos)).catch(() => setOutros([]));
    api.listarMeusTimes().then(setMeusTimes).catch(() => setMeusTimes([]));
    if (editandoId !== null) {
      api.obterCampeonato(editandoId).then((c) => {
        setNome(c.nome);
        setFormato(c.formato);
        setPontosVitoria(c.pontosVitoria);
        setPontosEmpate(c.pontosEmpate);
        setIdaVolta(c.idaVolta);
        setKoDesempate(c.koDesempate);
        setDuracao1T(c.duracaoPrimeiroTempo);
        setDuracao2T(c.duracaoSegundoTempo);
        if (c.numGrupos) setNumGrupos(c.numGrupos);
        if (c.avancamPorGrupo) setAvancamPorGrupo(c.avancamPorGrupo);
        if (c.criteriosDesempate && c.criteriosDesempate.length > 0) setCriterios(c.criteriosDesempate);
        if (c.playoff) {
          const match = (Object.keys(PLAYOFF_TEMPLATES) as (keyof typeof PLAYOFF_TEMPLATES)[])
            .find((k) => JSON.stringify(PLAYOFF_TEMPLATES[k].cfg) === JSON.stringify(c.playoff));
          if (match) setPlayoffTemplate(match);
        }
        setDescricao(c.descricao ?? '');
        setDataInicio(c.dataInicio ? c.dataInicio.slice(0, 10) : '');
        setDataFim(c.dataFim ? c.dataFim.slice(0, 10) : '');
        setVinculadoId(c.campeonatoVinculadoId != null ? String(c.campeonatoVinculadoId) : 'nenhum');
        setFaixas(c.faixasTabela ?? []);
      }).catch(() => setErro('Não foi possível carregar o campeonato'));
    }
  }, [editandoId]);

  function toggleTime(id: number) {
    const next = new Set(timesSelecionados);
    if (next.has(id)) next.delete(id); else next.add(id);
    setTimesSelecionados(next);
  }

  const opcao = FORMATOS.find((f) => f.value === formato)!;

  function moverCriterio(i: number, delta: number) {
    const a = i + delta;
    if (a < 0 || a >= criterios.length) return;
    const novo = [...criterios];
    [novo[i], novo[a]] = [novo[a], novo[i]];
    setCriterios(novo);
  }
  function toggleCriterio(c: CriterioDesempate) {
    setCriterios(criterios.includes(c) ? criterios.filter((x) => x !== c) : [...criterios, c]);
  }
  function addFaixa() { setFaixas([...faixas, { cor: CORES_FAIXA[0].hex, posInicio: 1, posFim: 1, legenda: '' }]); }
  function updFaixa(i: number, p: Partial<FaixaTabela>) {
    setFaixas(faixas.map((f, idx) => (idx === i ? { ...f, ...p } : f)));
  }
  function removeFaixa(i: number) { setFaixas(faixas.filter((_, idx) => idx !== i)); }

  async function salvar() {
    setErro(null);
    if (!nome.trim()) { setErro('Informe o nome do campeonato'); return; }
    for (const f of faixas) {
      if (!f.legenda.trim()) { setErro('Faixa sem legenda.'); return; }
      if (f.posFim < f.posInicio) { setErro('Faixa com posição final menor que inicial.'); return; }
    }
    setLoading(true);
    try {
      const payload = {
        nome: nome.trim(),
        formato,
        pontosVitoria,
        pontosEmpate,
        idaVolta: opcao.temKO || formato === 'PONTOS_CORRIDOS' || formato === 'GRUPOS' ? idaVolta : false,
        koDesempate: opcao.temKO ? koDesempate : undefined,
        duracaoPrimeiroTempo: duracao1T,
        duracaoSegundoTempo: duracao2T,
        numGrupos: opcao.grupos ? numGrupos : null,
        avancamPorGrupo: opcao.grupos ? avancamPorGrupo : null,
        playoff: opcao.playoff ? PLAYOFF_TEMPLATES[playoffTemplate].cfg : null,
        criteriosDesempate: criterios,
        dataInicio: dataInicio || null,
        dataFim: dataFim || null,
        descricao: descricao || null,
        faixasTabela: faixas.length > 0 ? faixas : null,
        campeonatoVinculadoId: vinculadoId !== 'nenhum' ? Number(vinculadoId) : null,
      };
      if (editandoId !== null) {
        await api.atualizarCampeonato(editandoId, payload);
      } else {
        const campCriado = await api.criarCampeonato(payload);
        for (const timeId of timesSelecionados) {
          try { await api.inscreverTime(campCriado.id, { timeId }); } catch { /* segue — usuário pode inscrever depois */ }
        }
      }
      navigate('/dashboard');
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível salvar');
    } finally { setLoading(false); }
  }

  return (
    <OrganizerLayout>
      <div className="p-10 pb-20 max-w-3xl">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ChevronLeft className="h-4 w-4" /> Painel
        </button>

        <h1 className="font-display text-4xl mb-10">{editando ? 'Editar campeonato' : 'Novo campeonato'}</h1>

        {erro && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive mb-6">{erro}</div>}

        <div className="divide-y divide-border">
          <Secao titulo="Identificação">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" placeholder="Copa Zona Leste 2026" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="inicio">Início</Label>
                <Input id="inicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fim">Término</Label>
                <Input id="fim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Descrição ou regulamento</Label>
              <textarea
                id="desc" rows={3}
                value={descricao} onChange={(e) => setDescricao(e.target.value)}
                placeholder="Regras específicas, premiação, local"
                className="w-full rounded-md border border-foreground/15 bg-input-background px-3 py-2 text-sm resize-none outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
          </Secao>

          <Secao titulo="Vínculo" ajuda="Liga uma Série A à Série B. Aparece botão de navegação na página pública.">
            <div className="space-y-2">
              <Label>Vincular a</Label>
              <Select value={vinculadoId} onValueChange={setVinculadoId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Sem vínculo</SelectItem>
                  {outros.map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </Secao>

          <Secao titulo="Formato">
            <div className="space-y-2">
              <Label>Formato</Label>
              <Select value={formato} onValueChange={(v) => setFormato(v as Formato)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORMATOS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{opcao.desc}</p>
            </div>

            {opcao.grupos && (
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="num-grupos">Nº de grupos</Label>
                  <Input id="num-grupos" type="number" min={2} max={32} value={numGrupos} onChange={(e) => setNumGrupos(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avancam">Classificados por grupo</Label>
                  <Input id="avancam" type="number" min={1} max={10} value={avancamPorGrupo} onChange={(e) => setAvancamPorGrupo(Number(e.target.value))} />
                </div>
              </div>
            )}

            {opcao.temKO && (
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={idaVolta} onChange={(e) => setIdaVolta(e.target.checked)} className="rounded border-foreground/20" />
                  Ida e volta (agregado)
                </label>
                <div className="space-y-2">
                  <Label>Resolução de empate</Label>
                  <Select value={koDesempate} onValueChange={(v) => setKoDesempate(v as KoDesempate)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENALTIS">Pênaltis diretos</SelectItem>
                      <SelectItem value="PRORROGACAO_PENALTIS">Prorrogação + pênaltis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {opcao.playoff && (
              <div className="space-y-2">
                <Label>Formato do playoff</Label>
                <Select value={playoffTemplate} onValueChange={(v) => setPlayoffTemplate(v as keyof typeof PLAYOFF_TEMPLATES)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLAYOFF_TEMPLATES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formato === 'PONTOS_CORRIDOS' && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={idaVolta} onChange={(e) => setIdaVolta(e.target.checked)} className="rounded border-foreground/20" />
                Turno e returno
              </label>
            )}

            {formato === 'GRUPOS' && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={idaVolta} onChange={(e) => setIdaVolta(e.target.checked)} className="rounded border-foreground/20" />
                Ida e volta dentro do grupo
              </label>
            )}
          </Secao>

          {formato !== 'MATA_MATA' && <Secao titulo="Pontuação">
            <div className="grid grid-cols-2 gap-5 max-w-sm">
              <div className="space-y-2">
                <Label htmlFor="pv">Vitória</Label>
                <Input id="pv" type="number" min={0} max={10} value={pontosVitoria} onChange={(e) => setPontosVitoria(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pe">Empate</Label>
                <Input id="pe" type="number" min={0} max={10} value={pontosEmpate} onChange={(e) => setPontosEmpate(Number(e.target.value))} />
              </div>
            </div>
          </Secao>}

          <Secao titulo="Duração do jogo" ajuda="Minutos por tempo. Ex.: sub-11 costuma jogar 2x25'.">
            <div className="grid grid-cols-2 gap-5 max-w-sm">
              <div className="space-y-2">
                <Label htmlFor="d1t">1º tempo (min)</Label>
                <Input id="d1t" type="number" min={1} max={90} value={duracao1T} onChange={(e) => setDuracao1T(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="d2t">2º tempo (min)</Label>
                <Input id="d2t" type="number" min={1} max={90} value={duracao2T} onChange={(e) => setDuracao2T(Number(e.target.value))} />
              </div>
            </div>
          </Secao>


          {formato !== 'MATA_MATA' && <Secao titulo="Critérios de desempate" ajuda="Aplicados em ordem depois dos pontos.">
            <div className="space-y-1.5">
              {criterios.map((c, i) => (
                <div key={c} className="flex items-center gap-2 border border-border rounded-md px-3 py-2 text-sm">
                  <span className="text-xs text-muted-foreground w-5 font-scoreboard">{i + 1}</span>
                  <span className="flex-1">{CRITERIOS_INFO[c]}</span>
                  <button onClick={() => moverCriterio(i, -1)} disabled={i === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                  <button onClick={() => moverCriterio(i, 1)} disabled={i === criterios.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
                  <button onClick={() => toggleCriterio(c)} className="p-1 text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CRITERIOS_INFO) as CriterioDesempate[])
                .filter((c) => !criterios.includes(c))
                .map((c) => (
                  <button key={c} onClick={() => toggleCriterio(c)} className="text-xs px-3 py-1.5 rounded-md border border-foreground/15 hover:bg-foreground/5">
                    + {CRITERIOS_INFO[c]}
                  </button>
                ))}
            </div>
          </Secao>}

          <Secao titulo="Faixas da classificação" ajuda="Cor e legenda ao lado das posições na tabela pública. Ex: verde = acesso, vermelho = rebaixamento.">
            {faixas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem faixas configuradas.</p>
            ) : (
              <div className="space-y-2">
                {faixas.map((f, i) => (
                  <div key={i} className="grid grid-cols-[auto_auto_auto_1fr_auto] items-center gap-3 border border-border rounded-md p-3">
                    <Select value={f.cor} onValueChange={(v) => updFaixa(i, { cor: v })}>
                      <SelectTrigger className="w-[140px]">
                        <span className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: f.cor }} />
                          {CORES_FAIXA.find((c) => c.hex === f.cor)?.nome ?? 'Cor'}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {CORES_FAIXA.map((c) => (
                          <SelectItem key={c.hex} value={c.hex}>
                            <span className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: c.hex }} />
                              {c.nome}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input type="number" min={1} value={f.posInicio} onChange={(e) => updFaixa(i, { posInicio: Number(e.target.value) })} className="w-16" />
                    <Input type="number" min={1} value={f.posFim} onChange={(e) => updFaixa(i, { posFim: Number(e.target.value) })} className="w-16" />
                    <Input placeholder="Ex: Acesso à Série A" value={f.legenda} onChange={(e) => updFaixa(i, { legenda: e.target.value })} />
                    <button onClick={() => removeFaixa(i)} className="p-2 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" size="sm" onClick={addFaixa}><Plus className="h-3.5 w-3.5" /> Adicionar faixa</Button>
          </Secao>

          {!editando && <Secao titulo="Times que vão disputar" ajuda="Escolhe aqui os clubes do seu cadastro que entram nesse campeonato. Dá pra inscrever mais depois.">
            {meusTimes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum time cadastrado ainda. Você pode criar depois em "Times" e inscrever manualmente.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {timesSelecionados.size} de {meusTimes.length} selecionados
                  </p>
                  <div className="flex gap-3 text-xs">
                    <button type="button" onClick={() => setTimesSelecionados(new Set(meusTimes.map((t) => t.id)))} className="underline text-muted-foreground hover:text-foreground">Selecionar todos</button>
                    <button type="button" onClick={() => setTimesSelecionados(new Set())} className="underline text-muted-foreground hover:text-foreground">Limpar</button>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {meusTimes.map((t) => {
                    const sel = timesSelecionados.has(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTime(t.id)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md border text-left transition ${sel ? 'border-foreground bg-foreground/[0.04]' : 'border-border hover:border-foreground/30'}`}
                      >
                        <TeamShield nome={t.nome} cor={t.cor} abreviacao={t.abreviacao} escudoUrl={t.escudoUrl} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">{t.nome}</p>
                          {t.cidade && <p className="text-xs text-muted-foreground truncate">{t.cidade}</p>}
                        </div>
                        <input type="checkbox" checked={sel} readOnly className="accent-foreground" />
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </Secao>}
        </div>

        <div className="flex items-center justify-end gap-3 pt-10">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} disabled={loading}>Cancelar</Button>
          <Button onClick={salvar} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} {editando ? 'Salvar alterações' : 'Criar campeonato'}
          </Button>
        </div>
      </div>
    </OrganizerLayout>
  );
}

function Secao({ titulo, ajuda, children }: { titulo: string; ajuda?: string; children: React.ReactNode }) {
  return (
    <section className="py-8 space-y-5">
      <div>
        <h3 className="font-display text-lg">{titulo}</h3>
        {ajuda && <p className="text-xs text-muted-foreground mt-1">{ajuda}</p>}
      </div>
      {children}
    </section>
  );
}
