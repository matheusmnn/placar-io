import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowUpRight, Loader2, Pencil, Trash2 } from 'lucide-react';
import { OrganizerLayout } from '../OrganizerLayout';
import { api, Campeonato, CampeonatosResponse, Formato, StatusCampeonato } from '../../lib/api';
import { campeonatoAtivo } from '../../lib/session';
import { useAuth } from '../../lib/useAuth';

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

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function Dashboard() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
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
  const primeiroNome = (usuario?.nome ?? '').trim().split(/\s+/)[0] || 'organizador';

  const q = busca.trim().toLowerCase();
  const casa = (c: Campeonato) => !q || c.nome.toLowerCase().includes(q);
  const meus = todos.filter((c) => c.papel === 'dono').filter(casa);
  const coAdm = todos.filter((c) => c.papel === 'co-adm').filter(casa);

  const emAndamento = meus.filter((c) => c.status === 'EM_ANDAMENTO');
  const rascunhos = meus.filter((c) => c.status === 'NAO_INICIADO');
  const encerrados = meus.filter((c) => c.status === 'ENCERRADO');

  const meta = (c: Campeonato) => `${c.qtdTimes} times · ${formatoLabel[c.formato]} · ${statusLabel[c.status]}`;

  return (
    <OrganizerLayout>
      <div className="pt-10 pb-24">
        {/* Breadcrumb */}
        <div className="font-scoreboard text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-7">Painel › Início</div>

        {/* Hero: números gigantes */}
        <div className="grid gap-9 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:items-end border-b border-foreground pb-7">
          <div>
            <div className="font-scoreboard text-[11px] uppercase tracking-[0.22em] text-brand">Seu painel · hoje</div>
            <h1 className="font-display text-[clamp(40px,7vw,68px)] leading-[0.95] mt-1">
              {saudacao()},<br />{primeiroNome}<span className="text-brand">.</span>
            </h1>
            <button
              onClick={() => navigate('/dashboard/novo')}
              className="mt-4 inline-flex items-center gap-2.5 px-[18px] py-2.5 bg-primary text-primary-foreground"
            >
              <span className="text-lg leading-none">+</span>
              <span className="font-scoreboard text-xs uppercase tracking-[0.14em]">Novo campeonato</span>
            </button>
          </div>
          <Figura rotulo="Em andamento" valor={emAndamento.length} destaque />
          <Figura rotulo="Rascunhos" valor={rascunhos.length} />
          <Figura rotulo="Encerrados" valor={encerrados.length} muted />
        </div>

        {/* Busca */}
        <div className="flex items-center gap-4 border-b border-border py-3.5 mt-0">
          <span className="font-scoreboard text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Buscar</span>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="por nome do campeonato…"
            className="flex-1 bg-transparent border-none outline-none font-display text-lg placeholder:text-muted-foreground"
          />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-12">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando
          </div>
        ) : erro ? (
          <p className="text-sm text-destructive py-12">{erro}</p>
        ) : todos.length === 0 ? (
          <div className="border border-dashed border-foreground/20 p-12 text-center mt-12">
            <p className="font-display text-2xl mb-2">Nenhum campeonato ainda</p>
            <p className="text-sm text-muted-foreground mb-5">Crie o primeiro pra começar a cadastrar times e abrir súmulas.</p>
            <button onClick={() => navigate('/dashboard/novo')} className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-scoreboard text-xs uppercase tracking-[0.14em]">
              <span className="text-base leading-none">+</span> Criar campeonato
            </button>
          </div>
        ) : (
          <div className="mt-10 space-y-12">
            {/* Em andamento — manchetes numeradas */}
            {emAndamento.length > 0 && (
              <section>
                <SecHead n="I" titulo="Em andamento" tag={`${String(emAndamento.length).padStart(2, '0')} títulos`} />
                {emAndamento.map((c, i) => (
                  <div key={c.id} className="group grid grid-cols-[48px_1fr_auto_auto] items-baseline gap-5 py-[18px] border-b border-border">
                    <span className="font-display text-4xl text-brand leading-none">{String(i + 1).padStart(2, '0')}</span>
                    <button onClick={() => abrir(c)} className="min-w-0 text-left">
                      <div className="font-display text-[26px] leading-tight truncate">{c.nome}</div>
                      <div className="font-scoreboard text-[11px] uppercase tracking-[0.08em] text-muted-foreground mt-1">{meta(c)}</div>
                    </button>
                    <span className="font-scoreboard text-[9.5px] uppercase tracking-[0.14em] px-2 py-1 border border-foreground self-center">Em curso</span>
                    <div className="flex items-center gap-1 self-center">
                      <button onClick={() => navigate(`/dashboard/editar/${c.id}`)} title="Editar vínculo e faixas" className="p-1.5 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => abrir(c)} title="Abrir" className="p-1.5 text-muted-foreground hover:text-foreground"><ArrowUpRight className="h-4 w-4" /></button>
                      <button onClick={(e) => excluir(c, e)} title="Excluir" className="p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* Rascunhos + Encerrados em duas colunas */}
            {(rascunhos.length > 0 || encerrados.length > 0) && (
              <div className="grid md:grid-cols-2 gap-x-10 gap-y-10">
                {rascunhos.length > 0 && (
                  <section>
                    <SecHead n="II" titulo="Rascunhos" />
                    {rascunhos.map((c) => (
                      <div key={c.id} className="group grid grid-cols-[1fr_auto] items-baseline gap-4 py-3 border-b border-border">
                        <button onClick={() => navigate(`/dashboard/editar/${c.id}`)} className="min-w-0 text-left">
                          <div className="font-display text-lg leading-tight truncate">{c.nome}</div>
                          <div className="font-scoreboard text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground mt-0.5">{c.qtdTimes} times · {formatoLabel[c.formato]}</div>
                        </button>
                        <div className="flex items-center gap-2 self-center">
                          <button onClick={() => navigate(`/dashboard/editar/${c.id}`)} className="font-scoreboard text-[10px] uppercase tracking-[0.14em] text-brand inline-flex items-center gap-1"><Pencil className="h-3 w-3" /> Editar</button>
                          <button onClick={(e) => excluir(c, e)} title="Excluir" className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </section>
                )}
                {encerrados.length > 0 && (
                  <section>
                    <SecHead n="III" titulo="Encerrados" tag={`${encerrados.length}`} />
                    {encerrados.map((c) => (
                      <div key={c.id} className="group grid grid-cols-[1fr_auto] items-baseline gap-4 py-3 border-b border-border">
                        <button onClick={() => abrir(c)} className="min-w-0 text-left">
                          <div className="font-display text-lg leading-tight truncate">{c.nome}</div>
                          <div className="font-scoreboard text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground mt-0.5">{c.qtdTimes} times · {formatoLabel[c.formato]}</div>
                        </button>
                        <div className="flex items-center gap-1 self-center">
                          <button onClick={() => navigate(`/dashboard/editar/${c.id}`)} title="Editar vínculo e faixas" className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => abrir(c)} title="Abrir" className="p-1 text-muted-foreground hover:text-foreground"><ArrowUpRight className="h-4 w-4" /></button>
                          <button onClick={(e) => excluir(c, e)} title="Excluir" className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </section>
                )}
              </div>
            )}

            {coAdm.length > 0 && (
              <section>
                <SecHead n="IV" titulo="Campeonatos que administro" tag={`${coAdm.length}`} />
                {coAdm.map((c) => (
                  <div key={c.id} className="group grid grid-cols-[1fr_auto] items-center gap-6 py-4 border-b border-border">
                    <button onClick={() => abrir(c)} className="min-w-0 text-left">
                      <p className="font-display text-lg leading-tight truncate">{c.nome}</p>
                      <p className="font-scoreboard text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground mt-0.5">{c.qtdTimes} times · {statusLabel[c.status]} · co-adm</p>
                    </button>
                    <button onClick={() => abrir(c)} className="p-1.5 text-muted-foreground hover:text-foreground" title="Abrir"><ArrowUpRight className="h-4 w-4" /></button>
                  </div>
                ))}
              </section>
            )}
          </div>
        )}
      </div>
    </OrganizerLayout>
  );
}

function Figura({ rotulo, valor, destaque, muted }: { rotulo: string; valor: number; destaque?: boolean; muted?: boolean }) {
  return (
    <div className="md:border-l md:border-border md:pl-6">
      <p className="font-scoreboard text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{rotulo}</p>
      <p className={`font-display text-[clamp(48px,8vw,80px)] leading-[0.9] mt-1 ${destaque ? 'text-brand' : muted ? 'text-muted-foreground' : 'text-foreground'}`}>{valor}</p>
    </div>
  );
}

function SecHead({ n, titulo, tag }: { n: string; titulo: string; tag?: string }) {
  return (
    <div className="flex items-baseline gap-3.5 border-b border-foreground pb-1.5 mb-2.5">
      <span className="font-scoreboard text-[11px] text-brand tracking-[0.18em]">{n}.</span>
      <span className="font-display text-[22px]">{titulo}</span>
      <span className="flex-1" />
      {tag && <span className="font-scoreboard text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tag}</span>}
    </div>
  );
}
