import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowUpRight, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { OrganizerLayout } from '../OrganizerLayout';
import { api, Campeonato, CampeonatosResponse, Formato, StatusCampeonato } from '../../lib/api';
import { campeonatoAtivo } from '../../lib/session';

const formatoLabel: Record<Formato, string> = {
  PONTOS_CORRIDOS: 'pontos corridos',
  MATA_MATA: 'mata-mata',
  GRUPOS: 'grupos',
  GRUPOS_MATA_MATA: 'grupos + mata-mata',
  PONTOS_CORRIDOS_MATA_MATA: 'liga + playoff',
};

const statusLabel: Record<StatusCampeonato, string> = {
  EM_ANDAMENTO: 'em andamento',
  ENCERRADO: 'encerrado',
  NAO_INICIADO: 'rascunho',
};

export function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<CampeonatosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  async function carregar() {
    setLoading(true);
    setErro(null);
    try {
      const r = await api.listarCampeonatos();
      setData(r);
      // Limpa ativo se ele não pertence mais ao usuário logado.
      const ativo = campeonatoAtivo.get();
      if (ativo && !r.campeonatos.some((c) => c.id === ativo.id)) {
        campeonatoAtivo.clear();
      }
    } catch {
      setErro('Não foi possível carregar seus campeonatos');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { carregar(); }, []);

  function abrir(c: Campeonato) {
    campeonatoAtivo.set({ id: c.id, nome: c.nome });
    navigate('/dashboard/rodadas');
  }

  async function excluir(c: Campeonato, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Excluir "${c.nome}"?`)) return;
    try {
      await api.excluirCampeonato(c.id);
      carregar();
    } catch {
      alert('Não foi possível excluir');
    }
  }

  const todos = data?.campeonatos ?? [];
  const hoje = useMemo(() => {
    return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }, []);

  const q = busca.trim().toLowerCase();
  const casa = (c: Campeonato) => !q || c.nome.toLowerCase().includes(q);
  const meus = todos.filter((c) => c.papel === 'dono').filter(casa);
  const coAdm = todos.filter((c) => c.papel === 'co-adm').filter(casa);

  const emAndamento = meus.filter((c) => c.status === 'EM_ANDAMENTO');
  const rascunhos = meus.filter((c) => c.status === 'NAO_INICIADO');
  const encerrados = meus.filter((c) => c.status === 'ENCERRADO');

  return (
    <OrganizerLayout>
      <div className="p-10 pb-20 max-w-5xl">
        <div className="flex items-start justify-between gap-6 mb-12">
          <div>
            <p className="text-sm text-muted-foreground">{hoje}</p>
            <h1 className="font-display text-4xl mt-2">Seu painel</h1>
          </div>
          <Button onClick={() => navigate('/dashboard/novo')}>
            <Plus className="h-4 w-4" /> Novo campeonato
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-10">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando
          </div>
        ) : erro ? (
          <p className="text-sm text-destructive">{erro}</p>
        ) : todos.length === 0 ? (
          <div className="border border-dashed border-foreground/15 rounded-md p-12 text-center">
            <p className="font-display text-xl mb-2">Nenhum campeonato ainda</p>
            <p className="text-sm text-muted-foreground mb-5">Crie o primeiro pra começar a cadastrar times e abrir súmulas.</p>
            <Button onClick={() => navigate('/dashboard/novo')}>
              <Plus className="h-4 w-4" /> Criar campeonato
            </Button>
          </div>
        ) : (
          <div className="space-y-12">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            {/* Resumo em números, sem card decorativo */}
            <div className="grid grid-cols-3 border-t border-b border-border divide-x divide-border">
              <Figura rotulo="Em andamento" valor={emAndamento.length} destaque />
              <Figura rotulo="Rascunhos" valor={rascunhos.length} />
              <Figura rotulo="Encerrados" valor={encerrados.length} />
            </div>

            <Lista titulo="Em andamento" lista={emAndamento} abrir={abrir} excluir={excluir} editar={(c) => navigate(`/dashboard/editar/${c.id}`)} />
            <Lista titulo="Rascunhos" lista={rascunhos} abrir={abrir} excluir={excluir} editar={(c) => navigate(`/dashboard/editar/${c.id}`)} />
            <Lista titulo="Encerrados" lista={encerrados} abrir={abrir} excluir={excluir} editar={(c) => navigate(`/dashboard/editar/${c.id}`)} />
            {coAdm.length > 0 && (
              <section>
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="font-display text-xl">Campeonatos que administro</h2>
                  <span className="text-xs text-muted-foreground font-scoreboard">{coAdm.length}</span>
                </div>
                <div className="border-y border-border divide-y divide-border">
                  {coAdm.map((c) => (
                    <div key={c.id} className="group grid grid-cols-[1fr_auto] items-center gap-6 py-4 px-2 -mx-2 hover:bg-foreground/[0.02] transition-colors">
                      <button onClick={() => abrir(c)} className="min-w-0 text-left cursor-pointer">
                        <p className="font-display text-lg leading-tight truncate">{c.nome}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <span className="font-scoreboard">{c.qtdTimes}</span> times · {statusLabel[c.status]} · co-adm
                        </p>
                      </button>
                      <button onClick={() => abrir(c)} className="text-muted-foreground group-hover:text-foreground cursor-pointer" title="Abrir">
                        <ArrowUpRight className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </OrganizerLayout>
  );
}

function Figura({ rotulo, valor, destaque }: { rotulo: string; valor: number; destaque?: boolean }) {
  return (
    <div className="py-6 px-6">
      <p className={`font-scoreboard text-5xl ${destaque ? 'text-brand' : 'text-foreground'}`}>{valor}</p>
      <p className="text-xs text-muted-foreground mt-1">{rotulo}</p>
    </div>
  );
}

function Lista({
  titulo, lista, abrir, excluir, editar,
}: {
  titulo: string;
  lista: Campeonato[];
  abrir: (c: Campeonato) => void;
  excluir: (c: Campeonato, e: React.MouseEvent) => void;
  editar: (c: Campeonato) => void;
}) {
  if (lista.length === 0) return null;
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-display text-xl">{titulo}</h2>
        <span className="text-xs text-muted-foreground font-scoreboard">{lista.length}</span>
      </div>
      <div className="border-y border-border divide-y divide-border">
        {lista.map((c) => (
          <div key={c.id} className="group grid grid-cols-[1fr_auto_auto_auto] items-center gap-6 py-4 px-2 -mx-2 hover:bg-foreground/[0.02] transition-colors">
            <button onClick={() => abrir(c)} className="min-w-0 text-left cursor-pointer">
              <p className="font-display text-lg leading-tight truncate">{c.nome}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-scoreboard">{c.qtdTimes}</span> times · {statusLabel[c.status]} · {/* eslint-disable-next-line */}
                {['EM_ANDAMENTO', 'ENCERRADO', 'NAO_INICIADO'].includes(c.status) && formatoLabel[c.formato]}
              </p>
            </button>
            <button onClick={() => abrir(c)} className="text-muted-foreground group-hover:text-foreground cursor-pointer" title="Abrir">
              <ArrowUpRight className="h-4 w-4" />
            </button>
            {c.status === 'NAO_INICIADO' ? (
              <button
                onClick={(e) => { e.stopPropagation(); editar(c); }}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-md"
                title="Editar"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            ) : <span />}
            <button
              onClick={(e) => excluir(c, e)}
              className="p-1.5 text-muted-foreground hover:text-destructive rounded-md"
              title="Excluir"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
