import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Loader2, Plus, Trash2, UserCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { OrganizerLayout } from '../OrganizerLayout';
import { TeamShield } from '../TeamShield';
import { api, ApiError, Grupo, Time } from '../../lib/api';
import { campeonatoAtivo, timeAtivo } from '../../lib/session';

const FORMATOS_COM_GRUPOS = new Set(['GRUPOS', 'GRUPOS_MATA_MATA']);

const CORES = [
  '#c84b1c', '#4a7a3e', '#14213d', '#b8871e',
  '#a93326', '#6a6355', '#2e5aa8', '#8c3fb5',
];

export function RegisterTeams() {
  const navigate = useNavigate();
  const ativo = campeonatoAtivo.get();

  const [inscritos, setInscritos] = useState<Time[]>([]);
  const [meusTimes, setMeusTimes] = useState<Time[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [temGrupos, setTemGrupos] = useState(false);
  const [loading, setLoading] = useState(true);

  const [nome, setNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [abreviacao, setAbreviacao] = useState('');
  const [cor, setCor] = useState(CORES[0]);
  const [escudoUrl, setEscudoUrl] = useState('');
  const [inscricaoGrupoId, setInscricaoGrupoId] = useState<number | null>(null);
  const [timeParaInscrever, setTimeParaInscrever] = useState<number | ''>('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregar() {
    setLoading(true);
    try {
      const mts = await api.listarMeusTimes();
      setMeusTimes(mts);

      if (ativo) {
        const camp = await api.obterCampeonato(ativo.id);
        const temG = FORMATOS_COM_GRUPOS.has(camp.formato);
        setTemGrupos(temG);
        const [ts, gs] = await Promise.all([
          api.listarTimes(ativo.id),
          temG ? api.listarGrupos(ativo.id) : Promise.resolve([] as Grupo[]),
        ]);
        setInscritos(ts);
        setGrupos(gs);
        if (temG && gs.length > 0 && inscricaoGrupoId == null) setInscricaoGrupoId(gs[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  const naoInscritos = useMemo(() => {
    const ids = new Set(inscritos.map((t) => t.id));
    return meusTimes.filter((t) => !ids.has(t.id));
  }, [meusTimes, inscritos]);

  async function cadastrarTime() {
    setErro(null);
    if (!nome.trim()) { setErro('Informe o nome do time'); return; }
    setSalvando(true);
    try {
      await api.criarTime({
        nome: nome.trim(),
        cidade: cidade || null,
        escudoUrl: escudoUrl || null,
        cor: cor || null,
        abreviacao: abreviacao.trim() || null,
      });
      setNome(''); setCidade(''); setAbreviacao(''); setEscudoUrl('');
      setCor(CORES[(CORES.indexOf(cor) + 1) % CORES.length]);
      carregar();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível cadastrar o time');
    } finally { setSalvando(false); }
  }

  async function inscrever() {
    if (!ativo || timeParaInscrever === '') return;
    if (temGrupos && inscricaoGrupoId == null) { setErro('Selecione o grupo'); return; }
    setSalvando(true);
    try {
      await api.inscreverTime(ativo.id, {
        timeId: Number(timeParaInscrever),
        grupoId: temGrupos ? inscricaoGrupoId : null,
      });
      setTimeParaInscrever('');
      carregar();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível inscrever');
    } finally { setSalvando(false); }
  }

  async function desinscrever(t: Time) {
    if (!ativo) return;
    if (!confirm(`Tirar "${t.nome}" deste campeonato? O cadastro do time continua.`)) return;
    try { await api.desinscreverTime(ativo.id, t.id); carregar(); }
    catch { alert('Não foi possível desinscrever'); }
  }

  async function excluir(t: Time) {
    if (!confirm(`Excluir "${t.nome}" do seu cadastro? Isso remove de todos os campeonatos.`)) return;
    try { await api.excluirTime(t.id); carregar(); }
    catch { alert('Não foi possível excluir'); }
  }

  function gerenciarJogadores(t: Time) {
    timeAtivo.set({ id: t.id, nome: t.nome });
    navigate('/dashboard/jogadores');
  }

  const grupoDoTime = (t: Time) => grupos.find((g) => g.id === t.grupoId)?.nome ?? '—';

  return (
    <OrganizerLayout>
      <div className="p-10 pb-20 max-w-4xl">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ChevronLeft className="h-4 w-4" /> Painel
        </button>

        <div className="flex items-end justify-between mb-10">
          <div>
            {ativo && <p className="text-sm text-muted-foreground">{ativo.nome}</p>}
            <h1 className="font-display text-4xl mt-2">Times</h1>
          </div>
          <span className="font-scoreboard text-2xl text-muted-foreground">
            {ativo ? `${inscritos.length} inscritos` : `${meusTimes.length} cadastrados`}
          </span>
        </div>

        {erro && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive mb-6">{erro}</div>}

        {ativo && (
          <section className="py-8 space-y-5 border-t border-border">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-lg">Times neste campeonato</h3>
              <span className="text-xs text-muted-foreground font-scoreboard">{inscritos.length}</span>
            </div>

            <div className="grid md:grid-cols-[1fr_auto_auto] gap-3 items-end">
              <div className="space-y-2">
                <Label>Inscrever time já cadastrado</Label>
                <select
                  value={timeParaInscrever === '' ? '' : String(timeParaInscrever)}
                  onChange={(e) => setTimeParaInscrever(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full h-10 rounded-md border border-foreground/15 bg-input-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50"
                  disabled={naoInscritos.length === 0}
                >
                  <option value="">{naoInscritos.length === 0 ? 'Todos os meus times já estão inscritos' : 'Selecione um time'}</option>
                  {naoInscritos.map((t) => (
                    <option key={t.id} value={t.id}>{t.nome}{t.cidade ? ` — ${t.cidade}` : ''}</option>
                  ))}
                </select>
              </div>
              {temGrupos && (
                <div className="space-y-2">
                  <Label>Grupo</Label>
                  <select
                    value={inscricaoGrupoId ?? ''}
                    onChange={(e) => setInscricaoGrupoId(e.target.value === '' ? null : Number(e.target.value))}
                    className="h-10 rounded-md border border-foreground/15 bg-input-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50"
                  >
                    {grupos.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                  </select>
                </div>
              )}
              <Button onClick={inscrever} disabled={salvando || timeParaInscrever === ''}>
                <Plus className="h-4 w-4" /> Inscrever
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando</div>
            ) : inscritos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum time inscrito nesse campeonato ainda.</p>
            ) : (
              <div className="divide-y divide-border border-y border-border">
                {inscritos.map((t) => (
                  <div key={t.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 py-3 px-2 -mx-2 hover:bg-foreground/[0.02]">
                    <TeamShield nome={t.nome} cor={t.cor} abreviacao={t.abreviacao} escudoUrl={t.escudoUrl} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm truncate">{t.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {t.cidade ?? '—'}{temGrupos && <> · grupo {grupoDoTime(t)}</>}
                      </p>
                    </div>
                    <button onClick={() => gerenciarJogadores(t)} className="p-2 text-muted-foreground hover:text-foreground" title="Jogadores">
                      <UserCircle className="h-4 w-4" />
                    </button>
                    <button onClick={() => desinscrever(t)} className="p-2 text-muted-foreground hover:text-destructive" title="Tirar do campeonato">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="py-8 space-y-5 border-t border-border">
          <h3 className="font-display text-lg">
            {ativo ? 'Cadastrar novo time' : 'Meus times'}
          </h3>

          <div className="grid md:grid-cols-[1fr_120px_1fr] gap-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Nome</Label>
              <Input id="team-name" placeholder="Atlético Vila Nova" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-abbr">Sigla</Label>
              <Input id="team-abbr" placeholder="AVN" maxLength={4} value={abreviacao} onChange={(e) => setAbreviacao(e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-city">Bairro ou cidade</Label>
              <Input id="team-city" placeholder="Vila Nova" value={cidade} onChange={(e) => setCidade(e.target.value)} />
            </div>
          </div>

          <div className="grid md:grid-cols-[auto_1fr] gap-4 items-end">
            <div className="space-y-2">
              <Label>Cor do escudo</Label>
              <div className="flex flex-wrap gap-2">
                {CORES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCor(c)}
                    className={`h-8 w-8 rounded-full border ${cor === c ? 'border-foreground' : 'border-foreground/15'}`}
                    style={{ backgroundColor: c }}
                    aria-label={`Cor ${c}`}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-escudo">Escudo (URL, opcional)</Label>
              <Input id="team-escudo" placeholder="https://..." value={escudoUrl} onChange={(e) => setEscudoUrl(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <TeamShield nome={nome || 'Preview'} cor={cor} abreviacao={abreviacao || null} size="lg" />
              <div>
                <p className="text-sm">{nome || 'Preview do escudo'}</p>
                <p className="text-xs text-muted-foreground">
                  {ativo ? 'Fica no seu cadastro — você inscreve depois' : 'Cadastro global — reaproveita entre ligas'}
                </p>
              </div>
            </div>
            <Button onClick={cadastrarTime} disabled={salvando}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Cadastrar time
            </Button>
          </div>
        </section>

        {!ativo && (
          <section className="py-8 border-t border-border">
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="font-display text-lg">Meus times cadastrados</h3>
              <span className="text-xs text-muted-foreground font-scoreboard">{meusTimes.length}</span>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando</div>
            ) : meusTimes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum time cadastrado ainda.</p>
            ) : (
              <div className="divide-y divide-border border-y border-border">
                {meusTimes.map((t) => (
                  <div key={t.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 py-3 px-2 -mx-2 hover:bg-foreground/[0.02]">
                    <TeamShield nome={t.nome} cor={t.cor} abreviacao={t.abreviacao} escudoUrl={t.escudoUrl} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm truncate">{t.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">{t.cidade ?? '—'}</p>
                    </div>
                    <button onClick={() => gerenciarJogadores(t)} className="p-2 text-muted-foreground hover:text-foreground" title="Jogadores">
                      <UserCircle className="h-4 w-4" />
                    </button>
                    <button onClick={() => excluir(t)} className="p-2 text-muted-foreground hover:text-destructive" title="Excluir do cadastro">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </OrganizerLayout>
  );
}
