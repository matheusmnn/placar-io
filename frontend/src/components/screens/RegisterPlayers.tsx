import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Trash2, ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { OrganizerLayout } from '../OrganizerLayout';
import { TeamShield } from '../TeamShield';
import { api, ApiError, ComissaoTecnica, FuncaoComissao, Jogador, Posicao } from '../../lib/api';
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

const posColor: Record<Posicao, string> = {
  GOLEIRO: 'bg-yellow-100 text-yellow-700',
  ZAGUEIRO: 'bg-blue-100 text-blue-700',
  LATERAL: 'bg-purple-100 text-purple-700',
  VOLANTE: 'bg-orange-100 text-orange-700',
  MEIA: 'bg-cyan-100 text-cyan-700',
  ATACANTE: 'bg-destructive/15 text-destructive',
};

export function RegisterPlayers() {
  const navigate = useNavigate();
  const ativo = campeonatoAtivo.get();
  const time = timeAtivo.get();

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
    if (!time) { navigate('/dashboard/times'); return; }
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregar() {
    if (!time) return;
    setLoading(true);
    try {
      const [js, cs] = await Promise.all([
        api.listarJogadores(time.id),
        api.listarComissao(time.id),
      ]);
      setJogadores(js);
      setComissao(cs);
    } finally {
      setLoading(false);
    }
  }

  async function adicionarComissao() {
    if (!time || !comNome.trim()) return;
    try {
      await api.criarComissao(time.id, { nome: comNome.trim(), funcao: comFuncao });
      setComNome('');
      carregar();
    } catch {
      alert('Não foi possível adicionar');
    }
  }

  async function excluirComissao(c: ComissaoTecnica) {
    if (!confirm(`Remover ${c.nome}?`)) return;
    try {
      await api.excluirComissao(c.id);
      carregar();
    } catch {
      alert('Não foi possível remover');
    }
  }

  async function adicionar() {
    if (!time) return;
    setErro(null);
    if (!nome.trim()) { setErro('Informe o nome do jogador'); return; }
    setSalvando(true);
    try {
      await api.criarJogador(time.id, {
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
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(j: Jogador) {
    if (!confirm(`Excluir o jogador "${j.nome}"?`)) return;
    try {
      await api.excluirJogador(j.id);
      carregar();
    } catch {
      alert('Não foi possível excluir o jogador');
    }
  }

  return (
    <OrganizerLayout>
      <div className="p-8 pb-24">
        <button
          onClick={() => navigate('/dashboard/times')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Times
        </button>

        <div className="flex items-center gap-4 mb-8">
          <TeamShield size="lg" />
          <div>
            <h1 className="text-foreground font-bold">{time?.nome}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              <span className="text-primary font-medium">{ativo?.nome}</span>
              {' '}· {jogadores.length} jogadores
            </p>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-border bg-background/50">
            <h3 className="text-sm text-foreground font-semibold">Adicionar jogador</h3>
          </div>
          <div className="p-6">
            {erro && (
              <div className="rounded-md bg-destructive/10 border border-red-200 px-3 py-2 text-sm text-destructive mb-4">{erro}</div>
            )}
            <div className="grid grid-cols-4 gap-4 items-end">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="player-name">Nome (como aparece na súmula) *</Label>
                <Input id="player-name" placeholder="Ex: Gabigol" value={nome} onChange={e => setNome(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Posição</Label>
                <Select value={posicao} onValueChange={v => setPosicao(v as Posicao)}>
                  <SelectTrigger id="position">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {posicoes.map(p => (
                      <SelectItem key={p.valor} value={p.valor}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="jersey">Número</Label>
                <Input id="jersey" type="number" placeholder="Ex: 10" min={1} max={99} value={numero} onChange={e => setNumero(e.target.value)} />
              </div>
            </div>

            <details className="mt-4 group">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                Dados oficiais (opcional)
              </summary>
              <div className="grid grid-cols-4 gap-4 items-end mt-3">
                <div className="space-y-2">
                  <Label htmlFor="apelido" className="text-xs font-normal text-muted-foreground">Apelido</Label>
                  <Input id="apelido" placeholder="Ex: Gabi" value={apelido} onChange={e => setApelido(e.target.value)} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="nome-completo" className="text-xs font-normal text-muted-foreground">Nome completo</Label>
                  <Input id="nome-completo" placeholder="Gabriel Barbosa Almeida" value={nomeCompleto} onChange={e => setNomeCompleto(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registro" className="text-xs font-normal text-muted-foreground">Registro</Label>
                  <Input id="registro" placeholder="CBF/CPF/etc" value={registro} onChange={e => setRegistro(e.target.value)} />
                </div>
                <div className="flex items-center gap-2 col-span-4 text-sm">
                  <input id="profissional" type="checkbox" checked={profissional}
                    onChange={e => setProfissional(e.target.checked)} className="h-4 w-4 accent-primary" />
                  <label htmlFor="profissional">Profissional (desmarque se for amador)</label>
                </div>
              </div>
            </details>
            <div className="flex justify-end mt-4">
              <Button
                className="text-white gap-2 bg-primary hover:bg-primary/90"
                onClick={adicionar}
                disabled={salvando}
              >
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Adicionar Jogador
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm text-foreground font-semibold">Elenco</h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{jogadores.length} jogadores</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
            </div>
          ) : jogadores.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Nenhum jogador cadastrado ainda.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-background/80 hover:bg-background/80">
                  <TableHead className="text-muted-foreground text-xs uppercase tracking-wide w-16 font-semibold">#</TableHead>
                  <TableHead className="text-muted-foreground text-xs uppercase tracking-wide font-semibold">Nome</TableHead>
                  <TableHead className="text-muted-foreground text-xs uppercase tracking-wide font-semibold">Posição</TableHead>
                  <TableHead className="text-muted-foreground text-xs uppercase tracking-wide text-right font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jogadores.map(player => (
                  <TableRow key={player.id} className="hover:bg-background">
                    <TableCell>
                      <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground font-semibold">
                        {player.numero ?? '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-foreground text-sm font-medium">{player.nome}</TableCell>
                    <TableCell>
                      {player.posicao && (
                        <Badge variant="secondary" className={`text-xs ${posColor[player.posicao]}`}>
                          {posLabel[player.posicao]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => excluir(player)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden mt-8">
          <div className="px-6 py-4 border-b border-border bg-muted/40 flex items-center justify-between">
            <h3 className="text-sm text-foreground font-semibold">Comissão técnica</h3>
            <span className="text-xs text-muted-foreground">{comissao.length} membro(s)</span>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-6 gap-3 items-end mb-4">
              <div className="col-span-3 space-y-2">
                <Label className="text-xs font-normal text-muted-foreground">Nome</Label>
                <Input placeholder="Ex: Dorival Júnior" value={comNome}
                  onChange={e => setComNome(e.target.value)} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-xs font-normal text-muted-foreground">Função</Label>
                <Select value={comFuncao} onValueChange={v => setComFuncao(v as FuncaoComissao)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(funcaoLabel).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={adicionarComissao} className="gap-1">
                <Plus className="w-4 h-4" /> Adicionar
              </Button>
            </div>

            {comissao.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum membro cadastrado. Vai aparecer na súmula quando você preencher.
              </p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {comissao.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0">
                      <td className="py-2 text-muted-foreground w-52">{funcaoLabel[c.funcao]}</td>
                      <td className="py-2 text-foreground">{c.nome}</td>
                      <td className="py-2 text-right">
                        <button onClick={() => excluirComissao(c)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </OrganizerLayout>
  );
}
