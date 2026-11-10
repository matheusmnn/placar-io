import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { OrganizerLayout } from '../OrganizerLayout';
import { api, ApiError, CriterioDesempate, Formato, KoDesempate, PlayoffConfig } from '../../lib/api';

const CRITERIOS_INFO: Record<CriterioDesempate, string> = {
  saldo: 'Saldo de gols',
  golsPro: 'Gols pró',
  golsContra: 'Menos gols sofridos',
  vitorias: 'Mais vitórias',
  sorteio: 'Sorteio (determinístico)',
};
const CRITERIOS_PADRAO: CriterioDesempate[] = ['saldo', 'golsPro'];

interface FormatoOpcao {
  value: Formato;
  label: string;
  desc: string;
  grupos?: boolean;
  temKO?: boolean;
  playoff?: boolean;
}

const FORMATOS: FormatoOpcao[] = [
  { value: 'PONTOS_CORRIDOS', label: 'Pontos corridos', desc: 'Todos se enfrentam. Vence quem somar mais pontos.' },
  { value: 'MATA_MATA', label: 'Mata-mata', desc: 'Eliminação direta. Quem perde está fora.', temKO: true },
  { value: 'GRUPOS', label: 'Grupos', desc: 'Fase de grupos. Cada grupo joga por si.', grupos: true },
  {
    value: 'GRUPOS_MATA_MATA',
    label: 'Grupos + mata-mata',
    desc: 'Fase de grupos classifica pro mata-mata.',
    grupos: true,
    temKO: true,
  },
  {
    value: 'PONTOS_CORRIDOS_MATA_MATA',
    label: 'Pontos corridos + playoff',
    desc: 'Liga regular + playoff configurável no fim.',
    temKO: true,
    playoff: true,
  },
];

const PLAYOFF_TEMPLATES: Record<string, { label: string; cfg: PlayoffConfig | null }> = {
  topQuatro: {
    label: 'Top 4 (1×4, 2×3, final)',
    cfg: { posicoes: [1, 2, 3, 4], chaveamento: [[1, 4], [2, 3]], temFinal: true, idaVolta: false, desempate: 'PENALTIS' },
  },
  acessoSerieB: {
    label: 'Acesso Série B (3×6, 4×5, sem final)',
    cfg: { posicoes: [3, 4, 5, 6], chaveamento: [[3, 6], [4, 5]], temFinal: false, idaVolta: false, desempate: 'PENALTIS' },
  },
  eflChampionship: {
    label: 'EFL Championship (3×6, 4×5, final em jogo único)',
    cfg: { posicoes: [3, 4, 5, 6], chaveamento: [[3, 6], [4, 5]], temFinal: true, idaVolta: true, desempate: 'PRORROGACAO_PENALTIS' },
  },
};

export function CreateChampionship() {
  const navigate = useNavigate();
  const [formato, setFormato] = useState<Formato>('PONTOS_CORRIDOS');
  const [nome, setNome] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [pontosVitoria, setPontosVitoria] = useState(3);
  const [pontosEmpate, setPontosEmpate] = useState(1);
  const [idaVolta, setIdaVolta] = useState(false);
  const [koDesempate, setKoDesempate] = useState<KoDesempate>('PENALTIS');
  const [numGrupos, setNumGrupos] = useState(4);
  const [avancamPorGrupo, setAvancamPorGrupo] = useState(2);
  const [playoffTemplate, setPlayoffTemplate] = useState<keyof typeof PLAYOFF_TEMPLATES>('topQuatro');
  const [criterios, setCriterios] = useState<CriterioDesempate[]>(CRITERIOS_PADRAO);
  const [descricao, setDescricao] = useState('');

  function moverCriterio(idx: number, delta: number) {
    const novo = [...criterios];
    const alvo = idx + delta;
    if (alvo < 0 || alvo >= novo.length) return;
    [novo[idx], novo[alvo]] = [novo[alvo], novo[idx]];
    setCriterios(novo);
  }
  function toggleCriterio(c: CriterioDesempate) {
    if (criterios.includes(c)) setCriterios(criterios.filter((x) => x !== c));
    else setCriterios([...criterios, c]);
  }
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const opcao = FORMATOS.find((f) => f.value === formato)!;

  async function salvar() {
    setErro(null);
    if (!nome.trim()) { setErro('Informe o nome do campeonato'); return; }
    setLoading(true);
    try {
      await api.criarCampeonato({
        nome: nome.trim(),
        formato,
        pontosVitoria,
        pontosEmpate,
        idaVolta: opcao.temKO || formato === 'PONTOS_CORRIDOS' ? idaVolta : false,
        koDesempate: opcao.temKO ? koDesempate : undefined,
        numGrupos: opcao.grupos ? numGrupos : null,
        avancamPorGrupo: opcao.grupos ? avancamPorGrupo : null,
        playoff: opcao.playoff ? PLAYOFF_TEMPLATES[playoffTemplate].cfg : null,
        criteriosDesempate: criterios,
        dataInicio: dataInicio || null,
        dataFim: dataFim || null,
        descricao: descricao || null,
      });
      navigate('/dashboard');
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível salvar o campeonato');
    } finally {
      setLoading(false);
    }
  }

  return (
    <OrganizerLayout>
      <div className="p-8 max-w-2xl pb-24">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Meus Campeonatos
        </button>

        <div className="mb-8">
          <h1 className="text-foreground font-bold">Novo Campeonato</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Preencha as informações para criar seu campeonato</p>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-8 py-5 border-b border-border bg-muted/40">
            <h3 className="text-foreground text-sm font-semibold">Informações do campeonato</h3>
          </div>

          <div className="p-8 space-y-7">
            {erro && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive max-w-lg">
                {erro}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="champ-name">
                Nome do Campeonato <span className="text-destructive">*</span>
              </Label>
              <Input id="champ-name" placeholder="Ex: Copa da Amizade 2026" className="max-w-lg"
                value={nome} onChange={e => setNome(e.target.value)} />
            </div>

            <div className="space-y-3">
              <Label>
                Formato <span className="text-destructive">*</span>
              </Label>
              <Select value={formato} onValueChange={(v) => setFormato(v as Formato)}>
                <SelectTrigger className="max-w-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORMATOS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground max-w-lg">{opcao.desc}</p>
            </div>

            {opcao.grupos && (
              <div className="grid grid-cols-2 gap-4 max-w-lg">
                <div className="space-y-2">
                  <Label htmlFor="num-grupos" className="text-xs text-muted-foreground font-normal">Nº de grupos</Label>
                  <Input id="num-grupos" type="number" min={2} max={32}
                    value={numGrupos} onChange={e => setNumGrupos(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avancam" className="text-xs text-muted-foreground font-normal">
                    {formato === 'GRUPOS_MATA_MATA' ? 'Classificados por grupo' : 'Classificados por grupo (só info)'}
                  </Label>
                  <Input id="avancam" type="number" min={1} max={10}
                    value={avancamPorGrupo} onChange={e => setAvancamPorGrupo(Number(e.target.value))} />
                </div>
              </div>
            )}

            {opcao.temKO && (
              <div className="space-y-3 max-w-lg">
                <Label>Mata-mata</Label>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <input id="ida-volta" type="checkbox"
                    checked={idaVolta} onChange={e => setIdaVolta(e.target.checked)}
                    className="h-4 w-4 accent-primary" />
                  <label htmlFor="ida-volta">Ida e volta (agregado)</label>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground font-normal">Resolução de empate</Label>
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
              <div className="space-y-2 max-w-lg">
                <Label>Formato do playoff</Label>
                <Select value={playoffTemplate} onValueChange={(v) => setPlayoffTemplate(v as keyof typeof PLAYOFF_TEMPLATES)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLAYOFF_TEMPLATES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Config aplicada ao final dos pontos corridos. Edição avançada do bracket virá em breve.
                </p>
              </div>
            )}

            {formato === 'PONTOS_CORRIDOS' && (
              <div className="flex items-center gap-2 text-sm text-foreground max-w-lg">
                <input id="ida-volta-pc" type="checkbox"
                  checked={idaVolta} onChange={e => setIdaVolta(e.target.checked)}
                  className="h-4 w-4 accent-primary" />
                <label htmlFor="ida-volta-pc">Turno e returno (ida e volta)</label>
              </div>
            )}

            <div className="space-y-3 max-w-lg">
              <Label>Critérios de desempate (ordem de prioridade)</Label>
              <p className="text-xs text-muted-foreground">
                Depois dos pontos, aplicamos os critérios na ordem abaixo até definir o desempate.
              </p>
              <div className="space-y-1">
                {criterios.map((c, i) => (
                  <div key={c} className="flex items-center gap-2 bg-muted/40 border border-border rounded px-3 py-1.5 text-sm">
                    <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                    <span className="text-foreground flex-1">{CRITERIOS_INFO[c]}</span>
                    <button onClick={() => moverCriterio(i, -1)} disabled={i === 0}
                      className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30">
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button onClick={() => moverCriterio(i, 1)} disabled={i === criterios.length - 1}
                      className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30">
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button onClick={() => toggleCriterio(c)}
                      className="p-1 text-muted-foreground hover:text-destructive text-xs">
                      remover
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {(Object.keys(CRITERIOS_INFO) as CriterioDesempate[])
                  .filter((c) => !criterios.includes(c))
                  .map((c) => (
                    <button key={c} onClick={() => toggleCriterio(c)}
                      className="text-xs px-2 py-1 rounded border border-border bg-background hover:bg-muted">
                      + {CRITERIOS_INFO[c]}
                    </button>
                  ))}
              </div>
            </div>

            <div>
              <Label className="block mb-3">Datas do Campeonato <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-2 gap-4 max-w-lg">
                <div className="space-y-2">
                  <Label htmlFor="start-date" className="text-xs text-muted-foreground font-normal">Data de início</Label>
                  <Input id="start-date" type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date" className="text-xs text-muted-foreground font-normal">Data de término</Label>
                  <Input id="end-date" type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <Label className="block mb-1">Pontuação</Label>
              <p className="text-xs text-muted-foreground mb-3">Defina quantos pontos cada resultado vale</p>
              <div className="grid grid-cols-2 gap-4 max-w-xs">
                <div className="space-y-2">
                  <Label htmlFor="win-pts" className="text-xs text-muted-foreground font-normal">Vitória</Label>
                  <Input id="win-pts" type="number" min={0} max={10}
                    value={pontosVitoria} onChange={e => setPontosVitoria(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="draw-pts" className="text-xs text-muted-foreground font-normal">Empate</Label>
                  <Input id="draw-pts" type="number" min={0} max={10}
                    value={pontosEmpate} onChange={e => setPontosEmpate(Number(e.target.value))} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">
                Descrição / Regulamento{' '}
                <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
              </Label>
              <textarea
                id="desc"
                rows={4}
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder="Adicione regras específicas, informações sobre premiação, local dos jogos..."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => navigate('/dashboard')} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={salvar} disabled={loading} className="gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Salvar Campeonato
              </Button>
            </div>
          </div>
        </div>
      </div>
    </OrganizerLayout>
  );
}
