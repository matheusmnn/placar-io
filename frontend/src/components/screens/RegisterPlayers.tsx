import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { OrganizerLayout } from '../OrganizerLayout';
import { TeamShield } from '../TeamShield';
import { api, ApiError, ComissaoTecnica, FuncaoComissao, Jogador, Posicao, Time } from '../../lib/api';
import { campeonatoAtivo, timeAtivo } from '../../lib/session';

const funcaoLabel: Record<FuncaoComissao, string> = {
  TECNICO: 'Técnico',
  ASSISTENTE_TECNICO: 'Assistente técnico',
  MEDICO: 'Médico',
  TREINADOR_GOLEIROS: 'Treinador de goleiros',
  PREPARADOR_FISICO: 'Preparador físico',
  FISIOTERAPEUTA: 'Fisioterapeuta',
  MASSAGISTA: 'Massagista',
};

const posicoes: { valor: Posicao; label: string }[] = [
  { valor: 'GOLEIRO', label: 'Goleiro' },
  { valor: 'ZAGUEIRO', label: 'Zagueiro' },
  { valor: 'LATERAL', label: 'Lateral' },
  { valor: 'VOLANTE', label: 'Volante' },
  { valor: 'MEIA', label: 'Meia' },
  { valor: 'ATACANTE', label: 'Atacante' },
];

const posLabel: Record<Posicao, string> = {
  GOLEIRO: 'Goleiro', ZAGUEIRO: 'Zagueiro', LATERAL: 'Lateral',
  VOLANTE: 'Volante', MEIA: 'Meia', ATACANTE: 'Atacante',
};

export function RegisterPlayers() {
  const navigate = useNavigate();
  const ativo = campeonatoAtivo.get();
  const timeSel = timeAtivo.get();

  const [time, setTime] = useState<Time | null>(null);
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [comissao, setComissao] = useState<ComissaoTecnica[]>([]);
  const [comNome, setComNome] = useState('');
  const [comFuncao, setComFuncao] = useState<FuncaoComissao>('TECNICO');
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [apelido, setApelido] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [registro, setRegistro] = useState('');
  const [posicao, setPosicao] = useState<Posicao | ''>('');
  const [numero, setNumero] = useState('');
  const [profissional, setProfissional] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!timeSel) { navigate('/dashboard/times'); return; }
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregar() {
    if (!timeSel || !ativo) return;
    setLoading(true);
    try {
      const [js, cs, ts] = await Promise.all([
        api.listarJogadores(timeSel.id),
        api.listarComissao(timeSel.id),
        api.listarTimes(ativo.id),
      ]);
      setJogadores(js);
      setComissao(cs);
      setTime(ts.find((t) => t.id === timeSel.id) ?? null);
    } finally { setLoading(false); }
  }

  async function adicionarComissao() {
    if (!timeSel || !comNome.trim()) return;
    try { await api.criarComissao(timeSel.id, { nome: comNome.trim(), funcao: comFuncao }); setComNome(''); carregar(); }
    catch { alert('Não foi possível adicionar'); }
  }

  async function excluirComissao(c: ComissaoTecnica) {
    if (!confirm(`Remover ${c.nome}?`)) return;
    try { await api.excluirComissao(c.id); carregar(); }
    catch { alert('Não foi possível remover'); }
  }

  async function adicionar() {
    if (!timeSel) return;
    setErro(null);
    if (!nome.trim()) { setErro('Informe o nome do jogador'); return; }
    setSalvando(true);
    try {
      await api.criarJogador(timeSel.id, {
        nome: nome.trim(),
        apelido: apelido.trim() || null,
        nomeCompleto: nomeCompleto.trim() || null,
        registro: registro.trim() || null,
        profissional,
        posicao: posicao || null,
        numero: numero ? Number(numero) : null,
      });
      setNome(''); setApelido(''); setNomeCompleto(''); setRegistro('');
      setPosicao(''); setNumero(''); setProfissional(true);
      carregar();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível adicionar o jogador');
    } finally { setSalvando(false); }
  }

  async function excluir(j: Jogador) {
    if (!confirm(`Excluir "${j.nome}"?`)) return;
    try { await api.excluirJogador(j.id); carregar(); }
    catch { alert('Não foi possível excluir'); }
  }

  return (
    <OrganizerLayout>
      <div className="p-10 pb-20 max-w-4xl">
        <button onClick={() => navigate('/dashboard/times')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ChevronLeft className="h-4 w-4" /> Times
        </button>

        <div className="flex items-center gap-5 mb-10">
          <TeamShield nome={time?.nome ?? timeSel?.nome} cor={time?.cor} abreviacao={time?.abreviacao} escudoUrl={time?.escudoUrl} size="xl" />
          <div>
            <p className="text-sm text-muted-foreground">{ativo?.nome}</p>
            <h1 className="font-display text-4xl mt-1">{timeSel?.nome}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="font-scoreboard">{jogadores.length}</span> jogadores · <span className="font-scoreboard">{comissao.length}</span> na comissão
            </p>
          </div>
        </div>

        <section className="py-8 space-y-5 border-t border-border">
          <h3 className="font-display text-lg">Adicionar jogador</h3>
          {erro && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</div>}

          <div className="grid md:grid-cols-[2fr_1fr_120px] gap-4">
            <div className="space-y-2">
              <Label htmlFor="player-name">Nome na súmula</Label>
              <Input id="player-name" placeholder="Rafael" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Posição</Label>
              <Select value={posicao} onValueChange={(v) => setPosicao(v as Posicao)}>
                <SelectTrigger id="position"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {posicoes.map((p) => <SelectItem key={p.valor} value={p.valor}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jersey">Nº</Label>
              <Input id="jersey" type="number" min={1} max={99} value={numero} onChange={(e) => setNumero(e.target.value)} />
            </div>
          </div>

          <details>
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Dados oficiais (opcional)</summary>
            <div className="grid md:grid-cols-4 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Apelido</Label>
                <Input value={apelido} onChange={(e) => setApelido(e.target.value)} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Nome completo</Label>
                <Input value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Registro</Label>
                <Input value={registro} onChange={(e) => setRegistro(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm md:col-span-4">
                <input type="checkbox" checked={profissional} onChange={(e) => setProfissional(e.target.checked)} className="rounded border-foreground/20" />
                Profissional
              </label>
            </div>
          </details>

          <div className="flex justify-end">
            <Button onClick={adicionar} disabled={salvando}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Adicionar jogador
            </Button>
          </div>
        </section>

        <section className="py-8 border-t border-border">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="font-display text-lg">Elenco</h3>
            <span className="text-xs text-muted-foreground font-scoreboard">{jogadores.length}</span>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando</div>
          ) : jogadores.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum jogador cadastrado ainda.</p>
          ) : (
            <div className="divide-y divide-border border-y border-border">
              {jogadores.map((j) => (
                <div key={j.id} className="grid grid-cols-[32px_1fr_auto_auto] items-center gap-4 py-3">
                  <span className="font-scoreboard text-sm text-muted-foreground">{j.numero ?? '—'}</span>
                  <div className="min-w-0">
                    <p className="text-sm">{j.nome}</p>
                    {j.apelido && <p className="text-xs text-muted-foreground">{j.apelido}</p>}
                  </div>
                  {j.posicao && <span className="text-xs text-muted-foreground">{posLabel[j.posicao]}</span>}
                  <button onClick={() => excluir(j)} className="p-2 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="py-8 border-t border-border">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="font-display text-lg">Comissão técnica</h3>
            <span className="text-xs text-muted-foreground font-scoreboard">{comissao.length}</span>
          </div>
          <div className="grid md:grid-cols-[2fr_1fr_auto] gap-3 mb-5">
            <Input placeholder="Nome" value={comNome} onChange={(e) => setComNome(e.target.value)} />
            <Select value={comFuncao} onValueChange={(v) => setComFuncao(v as FuncaoComissao)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(funcaoLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={adicionarComissao}><Plus className="h-4 w-4" /> Adicionar</Button>
          </div>
          {comissao.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum membro cadastrado.</p>
          ) : (
            <div className="divide-y divide-border border-y border-border">
              {comissao.map((c) => (
                <div key={c.id} className="flex items-center gap-4 py-3">
                  <span className="text-xs text-muted-foreground w-44">{funcaoLabel[c.funcao]}</span>
                  <span className="flex-1 text-sm">{c.nome}</span>
                  <button onClick={() => excluirComissao(c)} className="p-2 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </OrganizerLayout>
  );
}
