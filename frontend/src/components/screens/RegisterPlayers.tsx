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
import { api, ApiError, Jogador, Posicao } from '../../lib/api';
import { campeonatoAtivo, timeAtivo } from '../../lib/session';

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
  ATACANTE: 'bg-red-100 text-red-700',
};

export function RegisterPlayers() {
  const navigate = useNavigate();
  const ativo = campeonatoAtivo.get();
  const time = timeAtivo.get();

  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [posicao, setPosicao] = useState<Posicao | ''>('');
  const [numero, setNumero] = useState('');
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
      setJogadores(await api.listarJogadores(time.id));
    } finally {
      setLoading(false);
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
        posicao: posicao || undefined,
        numero: numero ? Number(numero) : undefined,
      });
      setNome(''); setPosicao(''); setNumero('');
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
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Times
        </button>

        <div className="flex items-center gap-4 mb-8">
          <TeamShield size="lg" />
          <div>
            <h1 className="text-gray-900 font-bold">{time?.nome}</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              <span className="text-green-600 font-medium">{ativo?.nome}</span>
              {' '}· {jogadores.length} jogadores
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-sm text-gray-700 font-semibold">Adicionar jogador</h3>
          </div>
          <div className="p-6">
            {erro && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600 mb-4">{erro}</div>
            )}
            <div className="grid grid-cols-4 gap-4 items-end">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="player-name">Nome do Jogador *</Label>
                <Input id="player-name" placeholder="Nome completo" value={nome} onChange={e => setNome(e.target.value)} />
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
                <Label htmlFor="jersey">Número da Camisa</Label>
                <Input id="jersey" type="number" placeholder="Ex: 10" min={1} max={99} value={numero} onChange={e => setNumero(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button
                className="text-white gap-2 bg-green-600 hover:bg-green-700"
                onClick={adicionar}
                disabled={salvando}
              >
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Adicionar Jogador
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm text-gray-700 font-semibold">Elenco</h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{jogadores.length} jogadores</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
            </div>
          ) : jogadores.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">Nenhum jogador cadastrado ainda.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                  <TableHead className="text-gray-500 text-xs uppercase tracking-wide w-16 font-semibold">#</TableHead>
                  <TableHead className="text-gray-500 text-xs uppercase tracking-wide font-semibold">Nome</TableHead>
                  <TableHead className="text-gray-500 text-xs uppercase tracking-wide font-semibold">Posição</TableHead>
                  <TableHead className="text-gray-500 text-xs uppercase tracking-wide text-right font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jogadores.map(player => (
                  <TableRow key={player.id} className="hover:bg-gray-50">
                    <TableCell>
                      <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-600 font-semibold">
                        {player.numero ?? '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-900 text-sm font-medium">{player.nome}</TableCell>
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
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Excluir">
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
      </div>
    </OrganizerLayout>
  );
}
