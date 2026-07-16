import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, UserCircle, Trash2, ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { OrganizerLayout } from '../OrganizerLayout';
import { TeamShield } from '../TeamShield';
import { api, ApiError, Time } from '../../lib/api';
import { campeonatoAtivo, timeAtivo } from '../../lib/session';

export function RegisterTeams() {
  const navigate = useNavigate();
  const ativo = campeonatoAtivo.get();

  const [times, setTimes] = useState<Time[]>([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [escudoUrl, setEscudoUrl] = useState('');
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
      setTimes(await api.listarTimes(ativo.id));
    } finally {
      setLoading(false);
    }
  }

  async function adicionar() {
    if (!ativo) return;
    setErro(null);
    if (!nome.trim()) { setErro('Informe o nome do time'); return; }
    setSalvando(true);
    try {
      await api.criarTime(ativo.id, { nome: nome.trim(), cidade: cidade || undefined, escudoUrl: escudoUrl || undefined });
      setNome(''); setCidade(''); setEscudoUrl('');
      carregar();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível adicionar o time');
    } finally {
      setSalvando(false);
    }
  }

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
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Meus Campeonatos
        </button>

        <div className="mb-8">
          <h1 className="text-gray-900 font-bold">Times</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            <span className="text-green-600 font-medium">{ativo?.nome}</span>
            {' '}· {times.length} times cadastrados
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-sm text-gray-700 font-semibold">Adicionar novo time</h3>
          </div>
          <div className="p-6">
            {erro && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600 mb-4">{erro}</div>
            )}
            <div className="grid grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="team-name">Nome do Time *</Label>
                <Input id="team-name" placeholder="Ex: Flamengo do Parque" value={nome} onChange={e => setNome(e.target.value)} />
              </div>
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
                className="text-white gap-2 bg-green-600 hover:bg-green-700"
                onClick={adicionar}
                disabled={salvando}
              >
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Adicionar Time
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm text-gray-700 font-semibold">Times cadastrados</h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{times.length} times</span>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
              </div>
            ) : times.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">Nenhum time cadastrado ainda.</div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {times.map(team => (
                  <div
                    key={team.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                  >
                    <TeamShield size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 text-sm truncate font-medium">{team.nome}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{team.cidade ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => gerenciarJogadores(team)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                        title="Gerenciar jogadores"
                      >
                        <UserCircle className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => excluir(team)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
