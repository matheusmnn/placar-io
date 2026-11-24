import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowDown, ArrowUp, Loader2, Plus, X } from 'lucide-react';
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

// Paleta "Jornal Esportivo" (1b) — paper frio, tinta quase-preta, azul elétrico.
// Hardcoded de propósito: a tela é sempre clara, independente dos tokens do app.
const C = {
  paper: '#eaeae2', sheet: '#f4f4ec',
  ink: '#111111', inkSoft: '#3b3b36', muted: '#6d6d66',
  blue: '#2a4bff', blueSoft: '#e6ebff', destructive: '#b91c1c',
  line: 'rgba(17,17,17,0.14)', lineSoft: 'rgba(17,17,17,0.1)', line2: 'rgba(17,17,17,0.2)',
};

const cap: CSSProperties = { display: 'block', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 };
const underline: CSSProperties = { background: 'transparent', border: 'none', borderBottom: `1.5px solid ${C.ink}`, outline: 'none', padding: '2px 0 6px', width: '100%', color: C.ink, fontFamily: 'inherit' };
const selectStyle: CSSProperties = { background: C.sheet, border: `1px solid ${C.line2}`, padding: '7px 10px', fontSize: 13, color: C.ink, width: '100%', cursor: 'pointer', fontFamily: 'inherit' };
const stepBtn: CSSProperties = { all: 'unset', cursor: 'pointer', width: 22, height: 22, border: `1px solid ${C.ink}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };

const GLYPHS: Record<Formato, ReactNode> = {
  PONTOS_CORRIDOS: <svg width="22" height="18" viewBox="0 0 22 18"><g fill="none" stroke="currentColor" strokeWidth="1"><circle cx="4" cy="4" r="2" /><circle cx="11" cy="4" r="2" /><circle cx="18" cy="4" r="2" /><circle cx="4" cy="14" r="2" /><circle cx="11" cy="14" r="2" /><circle cx="18" cy="14" r="2" /></g></svg>,
  MATA_MATA: <svg width="22" height="18" viewBox="0 0 22 18"><g fill="none" stroke="currentColor" strokeWidth="1"><path d="M2 2h6M2 6h6M10 4h6M18 4h2M10 14h6M18 14h2M2 12h6M2 16h6" /></g></svg>,
  GRUPOS: <svg width="22" height="18" viewBox="0 0 22 18"><g fill="none" stroke="currentColor" strokeWidth="1"><rect x="2" y="2" width="8" height="5" /><rect x="12" y="2" width="8" height="5" /><rect x="2" y="11" width="8" height="5" /><rect x="12" y="11" width="8" height="5" /></g></svg>,
  GRUPOS_MATA_MATA: <svg width="22" height="18" viewBox="0 0 22 18"><g fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="2" y="2" width="7" height="5" /><rect x="2" y="11" width="7" height="5" /><path d="M9 4h4v10h5M18 14v-10h2" /></g></svg>,
  PONTOS_CORRIDOS_MATA_MATA: <svg width="22" height="18" viewBox="0 0 22 18"><g fill="none" stroke="currentColor" strokeWidth="1"><path d="M2 3h14M2 7h14M2 11h14M2 15h14M17 6l3 3-3 3" /></g></svg>,
};

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

  function resumoFormato(): string {
    switch (formato) {
      case 'PONTOS_CORRIDOS': return idaVolta ? 'todos contra todos · turno e returno' : 'todos contra todos';
      case 'MATA_MATA': return `eliminação direta · ${idaVolta ? 'ida e volta' : 'jogo único'}`;
      case 'GRUPOS': return `${numGrupos} grupos${idaVolta ? ' · ida e volta' : ''}`;
      case 'GRUPOS_MATA_MATA': return `${numGrupos} grupos · ${avancamPorGrupo} avançam · mata-mata`;
      case 'PONTOS_CORRIDOS_MATA_MATA': return 'liga regular + playoff';
      default: return '';
    }
  }

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

  // Numeração romana contígua: só conta as seções que realmente renderizam.
  const roman = (() => { let i = 0; const R = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']; return () => `${R[i++]}.`; })();
  const subtitulo = descricao.trim() || `${opcao.label} — ${resumoFormato()}.`;
  const clubes = editando ? '—' : String(timesSelecionados.size);

  return (
    <OrganizerLayout>
      <div className="criar-jornal" style={{ color: C.ink }}>
        <style>{`.criar-jornal input:focus-visible, .criar-jornal textarea:focus-visible, .criar-jornal select:focus-visible, .criar-jornal button:focus-visible { outline: 2px solid ${C.blue}; outline-offset: 2px; }`}</style>

        <div>
          {/* Breadcrumb */}
          <div style={{ padding: '14px 0 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="font-scoreboard" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              <button type="button" onClick={() => navigate('/dashboard')} style={{ all: 'unset', cursor: 'pointer', color: C.blue }}>‹ Painel</button>
              <span style={{ color: C.muted }}> › {editando ? 'Editar' : 'Novo'}</span>
            </div>
            <div className="font-scoreboard" style={{ fontSize: 10, color: C.muted, letterSpacing: '0.14em' }}>{editando ? 'alterações não salvas' : 'rascunho'}</div>
          </div>

          {/* Hero */}
          <div style={{ padding: '26px 0 8px' }}>
            <div className="font-scoreboard" style={{ fontSize: 11, letterSpacing: '0.22em', color: C.blue, textTransform: 'uppercase' }}>{editando ? 'Edição de competição' : 'Abertura de competição'}</div>
            <h1 className="font-display" style={{ fontSize: 72, lineHeight: 0.95, margin: '4px 0 0', fontWeight: 600, letterSpacing: '-0.03em' }}>
              {nome.trim() || (editando ? 'Campeonato' : 'Novo campeonato')}<span style={{ color: C.blue }}>.</span>
            </h1>
            <div className="font-display" style={{ fontSize: 20, color: C.inkSoft, marginTop: 14, fontStyle: 'italic', maxWidth: 720, fontWeight: 500 }}>{subtitulo}</div>
          </div>

          {erro && (
            <div className="font-scoreboard" style={{ margin: '20px 0 0', border: `1px solid ${C.destructive}`, background: '#f7e0de', color: C.destructive, padding: '8px 12px', fontSize: 12, letterSpacing: '0.04em' }}>{erro}</div>
          )}

          {/* Corpo: form + preview */}
          <div className="grid gap-10 lg:grid-cols-[1fr_320px]" style={{ padding: '28px 0 8px', borderTop: `1px solid ${C.line2}`, marginTop: 20 }}>

            {/* FORM */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>

              {/* Identificação */}
              <section>
                <SectionHead n={roman()} title="Identificação" tag="obrigatório" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <label style={{ display: 'block' }}>
                    <span className="font-scoreboard" style={cap}>Nome</span>
                    <input className="font-display" style={{ ...underline, fontSize: 26 }} placeholder="Copa Zona Leste 2026" value={nome} onChange={(e) => setNome(e.target.value)} />
                  </label>
                  <div className="grid grid-cols-2 gap-6">
                    <label style={{ display: 'block' }}>
                      <span className="font-scoreboard" style={cap}>Início</span>
                      <input className="font-scoreboard" type="date" style={{ ...underline, fontSize: 15 }} value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                    </label>
                    <label style={{ display: 'block' }}>
                      <span className="font-scoreboard" style={cap}>Término</span>
                      <input className="font-scoreboard" type="date" style={{ ...underline, fontSize: 15 }} value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                    </label>
                  </div>
                  <label style={{ display: 'block' }}>
                    <span className="font-scoreboard" style={cap}>Descrição ou regulamento</span>
                    <textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Regras específicas, premiação, local"
                      style={{ background: 'transparent', border: `1px solid ${C.line2}`, outline: 'none', padding: '8px 10px', width: '100%', resize: 'vertical', fontSize: 13, color: C.ink, fontFamily: 'inherit' }} />
                  </label>
                  <label style={{ display: 'block' }}>
                    <span className="font-scoreboard" style={cap}>Vincular a (liga Série A ↔ Série B)</span>
                    <select style={selectStyle} value={vinculadoId} onChange={(e) => setVinculadoId(e.target.value)}>
                      <option value="nenhum">Sem vínculo</option>
                      {outros.map((c) => <option key={c.id} value={String(c.id)}>{c.nome}</option>)}
                    </select>
                  </label>
                </div>
              </section>

              {/* Formato */}
              <section>
                <SectionHead n={roman()} title="Formato da disputa" tag={opcao.label} />
                <div style={{ borderTop: `1px solid ${C.lineSoft}` }}>
                  {FORMATOS.map((f) => {
                    const sel = f.value === formato;
                    return (
                      <button key={f.value} type="button" aria-pressed={sel} onClick={() => setFormato(f.value)}
                        style={{ all: 'unset', cursor: 'pointer', display: 'grid', gridTemplateColumns: '28px 1fr 20px', gap: 12, alignItems: 'center', padding: '13px 10px', borderBottom: `1px solid ${C.lineSoft}`, background: sel ? C.blueSoft : 'transparent', borderLeft: sel ? `3px solid ${C.blue}` : '3px solid transparent', marginLeft: -3 }}>
                        <span style={{ color: sel ? C.blue : C.ink, display: 'inline-flex' }}>{GLYPHS[f.value]}</span>
                        <span>
                          <span className="font-display" style={{ fontSize: 16, fontWeight: sel ? 700 : 600, color: C.ink, display: 'block' }}>{f.label}</span>
                          <span style={{ fontSize: 11.5, color: sel ? C.inkSoft : C.muted }}>{f.desc}</span>
                        </span>
                        <span style={{ width: 14, height: 14, borderRadius: '50%', border: `1.5px solid ${sel ? C.blue : C.ink}`, background: sel ? C.blue : 'transparent', boxShadow: sel ? `inset 0 0 0 2px ${C.blueSoft}` : 'none' }} />
                      </button>
                    );
                  })}
                </div>

                {/* sub-opções do formato */}
                <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {opcao.grupos && (
                    <div className="grid grid-cols-2 gap-3">
                      <StepCell label="Nº de grupos" value={numGrupos} onChange={setNumGrupos} min={2} max={32} />
                      <StepCell label="Classificados / grupo" value={avancamPorGrupo} onChange={setAvancamPorGrupo} min={1} max={10} />
                    </div>
                  )}

                  {opcao.temKO && (
                    <>
                      <Switch label="Ida e volta" sub="agregado soma" on={idaVolta} onChange={setIdaVolta} />
                      <div>
                        <span className="font-scoreboard" style={cap}>Empate no mata-mata</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {([['PENALTIS', 'Pênaltis'], ['PRORROGACAO_PENALTIS', 'Prorrog. + pênaltis']] as [KoDesempate, string][]).map(([v, l]) => {
                            const on = koDesempate === v;
                            return (
                              <button key={v} type="button" aria-pressed={on} onClick={() => setKoDesempate(v)} className="font-scoreboard"
                                style={{ all: 'unset', cursor: 'pointer', fontSize: 11, padding: '6px 12px', letterSpacing: '0.06em', background: on ? C.ink : 'transparent', color: on ? C.sheet : C.muted, border: `1px solid ${on ? C.ink : C.line2}` }}>{l}</button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {opcao.playoff && (
                    <label style={{ display: 'block' }}>
                      <span className="font-scoreboard" style={cap}>Formato do playoff</span>
                      <select style={selectStyle} value={playoffTemplate} onChange={(e) => setPlayoffTemplate(e.target.value as keyof typeof PLAYOFF_TEMPLATES)}>
                        {Object.entries(PLAYOFF_TEMPLATES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </label>
                  )}

                  {formato === 'PONTOS_CORRIDOS' && <Switch label="Turno e returno" sub="todos jogam em casa e fora" on={idaVolta} onChange={setIdaVolta} />}
                  {formato === 'GRUPOS' && <Switch label="Ida e volta no grupo" sub="confrontos dobrados" on={idaVolta} onChange={setIdaVolta} />}
                </div>
              </section>

              {/* Pontuação & duração */}
              <section>
                <SectionHead n={roman()} title="Pontuação & duração" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {formato !== 'MATA_MATA' && <StepCell label="Pts vitória" value={pontosVitoria} onChange={setPontosVitoria} min={0} max={10} />}
                  {formato !== 'MATA_MATA' && <StepCell label="Pts empate" value={pontosEmpate} onChange={setPontosEmpate} min={0} max={10} />}
                  <StepCell label="1º tempo (min)" value={duracao1T} onChange={setDuracao1T} min={1} max={90} />
                  <StepCell label="2º tempo (min)" value={duracao2T} onChange={setDuracao2T} min={1} max={90} />
                </div>
              </section>

              {/* Critérios */}
              {formato !== 'MATA_MATA' && (
                <section>
                  <SectionHead n={roman()} title="Critérios de desempate" tag="ordem aplica depois dos pontos" />
                  <div>
                    {criterios.map((c, i) => (
                      <div key={c} style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.lineSoft}` }}>
                        <span className="font-scoreboard" style={{ fontSize: 18 }}>{String(i + 1).padStart(2, '0')}</span>
                        <span className="font-display" style={{ fontSize: 15 }}>{CRITERIOS_INFO[c]}</span>
                        <span style={{ display: 'flex', gap: 2, color: C.muted }}>
                          <button type="button" aria-label="Subir" onClick={() => moverCriterio(i, -1)} disabled={i === 0} style={{ all: 'unset', cursor: 'pointer', padding: 4, opacity: i === 0 ? 0.3 : 1 }}><ArrowUp className="h-3.5 w-3.5" /></button>
                          <button type="button" aria-label="Descer" onClick={() => moverCriterio(i, 1)} disabled={i === criterios.length - 1} style={{ all: 'unset', cursor: 'pointer', padding: 4, opacity: i === criterios.length - 1 ? 0.3 : 1 }}><ArrowDown className="h-3.5 w-3.5" /></button>
                          <button type="button" aria-label="Remover" onClick={() => toggleCriterio(c)} style={{ all: 'unset', cursor: 'pointer', padding: 4 }}><X className="h-3.5 w-3.5" /></button>
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                    {(Object.keys(CRITERIOS_INFO) as CriterioDesempate[]).filter((c) => !criterios.includes(c)).map((c) => (
                      <button key={c} type="button" onClick={() => toggleCriterio(c)} className="font-scoreboard" style={{ all: 'unset', cursor: 'pointer', fontSize: 11, padding: '5px 10px', border: `1px dashed ${C.line2}`, color: C.muted }}>+ {CRITERIOS_INFO[c]}</button>
                    ))}
                  </div>
                </section>
              )}

              {/* Faixas */}
              <section>
                <SectionHead n={roman()} title="Faixas da classificação" tag="cor + legenda na tabela pública" />
                {faixas.length === 0 ? (
                  <p style={{ fontSize: 13, color: C.muted }}>Sem faixas configuradas. Ex.: verde = acesso, vermelho = rebaixamento.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {faixas.map((f, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto auto auto 1fr auto', gap: 10, alignItems: 'center', border: `1px solid ${C.line2}`, padding: 10 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 14, height: 14, background: f.cor, flexShrink: 0 }} />
                          <select aria-label="Cor" style={{ ...selectStyle, width: 'auto', padding: '4px 6px' }} value={f.cor} onChange={(e) => updFaixa(i, { cor: e.target.value })}>
                            {CORES_FAIXA.map((c) => <option key={c.hex} value={c.hex}>{c.nome}</option>)}
                          </select>
                        </span>
                        <input aria-label="Posição inicial" type="number" min={1} value={f.posInicio} onChange={(e) => updFaixa(i, { posInicio: Number(e.target.value) })} className="font-scoreboard" style={{ ...underline, width: 44, fontSize: 15, textAlign: 'center' }} />
                        <input aria-label="Posição final" type="number" min={1} value={f.posFim} onChange={(e) => updFaixa(i, { posFim: Number(e.target.value) })} className="font-scoreboard" style={{ ...underline, width: 44, fontSize: 15, textAlign: 'center' }} />
                        <input placeholder="Ex: Acesso à Série A" value={f.legenda} onChange={(e) => updFaixa(i, { legenda: e.target.value })} style={{ ...underline, fontSize: 14 }} />
                        <button type="button" aria-label="Remover faixa" onClick={() => removeFaixa(i)} style={{ all: 'unset', cursor: 'pointer', padding: 4, color: C.muted }}><X className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" onClick={addFaixa} className="font-scoreboard" style={{ all: 'unset', cursor: 'pointer', marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, letterSpacing: '0.08em', padding: '6px 12px', border: `1px solid ${C.ink}`, textTransform: 'uppercase' }}><Plus className="h-3.5 w-3.5" /> Adicionar faixa</button>
              </section>

              {/* Times */}
              {!editando && (
                <section>
                  <SectionHead n={roman()} title="Times que vão disputar" tag={meusTimes.length ? `${timesSelecionados.size} / ${meusTimes.length}` : undefined} />
                  {meusTimes.length === 0 ? (
                    <p style={{ fontSize: 13, color: C.muted }}>Nenhum time cadastrado ainda. Dá pra criar em “Times” e inscrever depois.</p>
                  ) : (
                    <>
                      <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
                        <button type="button" onClick={() => setTimesSelecionados(new Set(meusTimes.map((t) => t.id)))} className="font-scoreboard" style={{ all: 'unset', cursor: 'pointer', fontSize: 10, letterSpacing: '0.12em', color: C.blue, textTransform: 'uppercase' }}>Selecionar todos</button>
                        <button type="button" onClick={() => setTimesSelecionados(new Set())} className="font-scoreboard" style={{ all: 'unset', cursor: 'pointer', fontSize: 10, letterSpacing: '0.12em', color: C.muted, textTransform: 'uppercase' }}>Limpar</button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                        {meusTimes.map((t) => {
                          const sel = timesSelecionados.has(t.id);
                          return (
                            <button key={t.id} type="button" aria-pressed={sel} onClick={() => toggleTime(t.id)}
                              style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: `1px solid ${sel ? C.blue : C.line2}`, background: sel ? C.blueSoft : 'transparent' }}>
                              <TeamShield nome={t.nome} cor={t.cor} abreviacao={t.abreviacao} escudoUrl={t.escudoUrl} size="sm" />
                              <span style={{ minWidth: 0, flex: 1 }}>
                                <span className="font-display" style={{ fontSize: 14, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.nome}</span>
                                {t.cidade && <span style={{ fontSize: 11, color: C.muted }}>{t.cidade}</span>}
                              </span>
                              <span style={{ width: 14, height: 14, borderRadius: '50%', border: `1.5px solid ${sel ? C.blue : C.ink}`, background: sel ? C.blue : 'transparent', boxShadow: sel ? `inset 0 0 0 2px ${C.blueSoft}` : 'none', flexShrink: 0 }} />
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </section>
              )}
            </div>

            {/* PREVIEW rail */}
            <aside className="self-start lg:sticky lg:top-6">
              <div style={{ background: C.ink, color: C.sheet, padding: '16px 16px 18px' }}>
                <div className="font-scoreboard" style={{ fontSize: 9.5, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.7 }}>Preview ao vivo</div>
                <div className="font-display" style={{ fontSize: 24, fontWeight: 600, marginTop: 4, lineHeight: 1.05 }}>{opcao.label}</div>
                <div className="font-scoreboard" style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>{resumoFormato()}</div>
                <div className="grid grid-cols-2 gap-2.5" style={{ marginTop: 14 }}>
                  <PrevStat label="Clubes" value={clubes} />
                  <PrevStat label="Pts vitória" value={formato === 'MATA_MATA' ? '—' : String(pontosVitoria)} />
                  <PrevStat label="1º tempo" value={`${duracao1T}′`} />
                  <PrevStat label="2º tempo" value={`${duracao2T}′`} />
                </div>
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line2}` }}>
                <div className="font-scoreboard" style={{ fontSize: 10, letterSpacing: '0.14em', color: C.muted, textTransform: 'uppercase' }}>Status</div>
                <div className="font-display" style={{ fontSize: 15, marginTop: 2, color: C.ink }}>{nome.trim() ? 'Pronto pra selecionar os times →' : 'Dê um nome pra começar.'}</div>
              </div>
            </aside>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0 40px', borderTop: `4px double ${C.ink}`, marginTop: 20 }}>
            <div className="font-scoreboard" style={{ fontSize: 10, letterSpacing: '0.18em', color: C.muted, textTransform: 'uppercase' }}>{editando ? 'Salve pra aplicar as mudanças' : 'Rascunho · você inscreve mais times depois'}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => navigate('/dashboard')} disabled={loading} style={{ all: 'unset', cursor: loading ? 'default' : 'pointer', padding: '10px 18px', fontSize: 13, color: C.ink, opacity: loading ? 0.5 : 1 }}>Cancelar</button>
              <button type="button" onClick={salvar} disabled={loading} className="font-scoreboard" style={{ all: 'unset', cursor: loading ? 'default' : 'pointer', padding: '10px 22px', background: C.blue, color: C.sheet, fontSize: 12, letterSpacing: '0.06em', fontWeight: 600, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 8, opacity: loading ? 0.6 : 1 }}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}{editando ? 'Salvar alterações' : 'Abrir campeonato →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </OrganizerLayout>
  );
}

function SectionHead({ n, title, tag }: { n: string; title: string; tag?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, borderBottom: `1px solid ${C.line}`, paddingBottom: 6, marginBottom: 16 }}>
      <span className="font-scoreboard" style={{ fontSize: 11, color: C.blue, letterSpacing: '0.18em' }}>{n}</span>
      <span className="font-display" style={{ fontSize: 18, fontWeight: 600, color: C.ink }}>{title}</span>
      <span style={{ flex: 1 }} />
      {tag && <span className="font-scoreboard" style={{ fontSize: 10, color: C.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{tag}</span>}
    </div>
  );
}

function StepCell({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <div style={{ border: `1px solid ${C.line}`, padding: '10px 12px' }}>
      <span className="font-scoreboard" style={cap}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button type="button" aria-label={`${label}: diminuir`} onClick={() => set(value - 1)} className="font-scoreboard" style={stepBtn}>−</button>
        <span className="font-scoreboard" style={{ fontSize: 22, minWidth: 20, textAlign: 'center' }}>{value}</span>
        <button type="button" aria-label={`${label}: aumentar`} onClick={() => set(value + 1)} className="font-scoreboard" style={stepBtn}>+</button>
      </div>
    </div>
  );
}

function Switch({ label, sub, on, onChange }: { label: string; sub: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: `1px solid ${C.line}` }}>
      <span>
        <span className="font-display" style={{ fontSize: 14, fontWeight: 600, color: C.ink, display: 'block' }}>{label}</span>
        <span className="font-scoreboard" style={{ fontSize: 10, color: C.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{sub}</span>
      </span>
      <span style={{ width: 40, height: 22, borderRadius: 11, background: on ? C.blue : '#c7bfae', position: 'relative', flexShrink: 0, transition: 'background .15s' }}>
        <span style={{ width: 16, height: 16, background: C.sheet, borderRadius: '50%', position: 'absolute', top: 3, left: on ? 21 : 3, transition: 'left .15s' }} />
      </span>
    </button>
  );
}

function PrevStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: '1px solid rgba(234,234,226,0.14)', padding: '8px 10px' }}>
      <div className="font-scoreboard" style={{ fontSize: 9, letterSpacing: '0.18em', opacity: 0.55, textTransform: 'uppercase' }}>{label}</div>
      <div className="font-display" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1, marginTop: 2 }}>{value}</div>
    </div>
  );
}
