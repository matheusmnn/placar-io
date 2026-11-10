import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, UserCircle, Trash2, ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { OrganizerLayout } from '../OrganizerLayout';
import { TeamShield } from '../TeamShield';
import { api, ApiError, Grupo, Time } from '../../lib/api';
import { campeonatoAtivo, timeAtivo } from '../../lib/session';

const FORMATOS_COM_GRUPOS = new Set(['GRUPOS', 'GRUPOS_MATA_MATA']);

export function RegisterTeams() {
  const navigate = useNavigate();
  const ativo = campeonatoAtivo.get();

  const [times, setTimes] = useState<Time[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [temGrupos, setTemGrupos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [escudoUrl, setEscudoUrl] = useState('');
  const [grupoId, setGrupoId] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!ativo) { navigate('/dashboard'); return; }
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregar() {
    if (!ativo) return;
    setLoading(true);
    try {
      const camp = await api.obterCampeonato(ativo.id);
      const temG = FORMATOS_COM_GRUPOS.has(camp.formato);
      setTemGrupos(temG);
      const [ts, gs] = await Promise.all([
        api.listarTimes(ativo.id),
        temG ? api.listarGrupos(ativo.id) : Promise.resolve([] as Grupo[]),
      ]);
      setTimes(ts);
      setGrupos(gs);
      if (temG && gs.length > 0 && grupoId == null) setGrupoId(gs[0].id);
    } finally {
      setLoading(false);
    }
  }

  async function adicionar() {
    if (!ativo) return;
    setErro(null);
    if (!nome.trim()) { setErro('Informe o nome do time'); return; }
    if (temGrupos && grupoId == null) { setErro('Selecione o grupo do time'); return; }
    setSalvando(true);
    try {
      await api.criarTime(ativo.id, {
        nome: nome.trim(),
        cidade: cidade || undefined,
        escudoUrl: escudoUrl || undefined,
        grupoId: temGrupos ? grupoId : null,
      });
      setNome(''); setCidade(''); setEscudoUrl('');
      carregar();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível adicionar o time');
    } finally {
      setSalvando(false);
    }
  }

  const grupoDoTime = (t: Time) => grupos.find((g) => g.id === t.grupoId)?.nome ?? '—';

  async function excluir(t: Time) {
    if (!confirm(`Excluir o time "${t.nome}"?`)) return;
    try {
      await api.excluirTime(t.id);
      carregar();
    } catch {
      alert('Não foi possível excluir o time');
    }
  }

  function gerenciarJogadores(t: Time) {
    timeAtivo.set({ id: t.id, nome: t.nome });
    navigate('/dashboard/jogadores');
  }

  return (
    <OrganizerLayout>
      <div className="p-8 pb-24">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Meus Campeonatos
        </button>

        <div className="mb-8">
          <h1 className="text-foreground font-bold">Times</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            <span className="text-primary font-medium">{ativo?.nome}</span>
            {' '}· {times.length} times cadastrados
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-border bg-background/50">
            <h3 className="text-sm text-foreground font-semibold">Adicionar novo time</h3>
          </div>
          <div className="p-6">
            {erro && (
              <div className="rounded-md bg-destructive/10 border border-red-200 px-3 py-2 text-sm text-destructive mb-4">{erro}</div>
            )}
            <div className={`grid gap-4 items-end ${temGrupos ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <div className="space-y-2">
                <Label htmlFor="team-name">Nome do Time *</Label>
                <Input id="team-name" placeholder="Ex: Flamengo do Parque" value={nome} onChange={e => setNome(e.target.value)} />
              </div>
              {temGrupos && (
                <div className="space-y-2">
                  <Label htmlFor="grupo">Grupo *</Label>
                  <select
                    id="grupo"
                    value={grupoId ?? ''}
                    onChange={e => setGrupoId(e.target.value === '' ? null : Number(e.target.value))}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="">Selecione…</option>
                    {grupos.map(g => (
                      <option key={g.id} value={g.id}>{g.nome}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" placeholder="Ex: São Paulo, SP" value={cidade} onChange={e => setCidade(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="escudo">Escudo (URL)</Label>
                <Input id="escudo" placeholder="https://..." value={escudoUrl} onChange={e => setEscudoUrl(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button
                className="text-white gap-2 bg-primary hover:bg-primary/90"
                onClick={adicionar}
                disabled={salvando}
              >
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Adicionar Time
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm text-foreground font-semibold">Times cadastrados</h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{times.length} times</span>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
              </div>
            ) : times.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Nenhum time cadastrado ainda.</div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {times.map(team => (
                  <div
                    key={team.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-border hover:shadow-sm transition-all"
                  >
                    <TeamShield size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm truncate font-medium">{team.nome}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {team.cidade ?? '—'}
                        {temGrupos && <> · Grupo {grupoDoTime(team)}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => gerenciarJogadores(team)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Gerenciar jogadores"
                      >
                        <UserCircle className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => excluir(team)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Excluir time"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </OrganizerLayout>
  );
}
