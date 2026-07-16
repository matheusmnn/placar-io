import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Settings2, Trash2, Eye, Trophy, TrendingUp, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { OrganizerLayout } from '../OrganizerLayout';
import { api, Campeonato, CampeonatosResponse, Formato, StatusCampeonato } from '../../lib/api';
import { campeonatoAtivo } from '../../lib/session';

const formatoLabel: Record<Formato, string> = {
  PONTOS_CORRIDOS: 'Pontos Corridos',
  MATA_MATA: 'Mata-Mata',
};

const statusLabel: Record<StatusCampeonato, string> = {
  EM_ANDAMENTO: 'Em andamento',
  ENCERRADO: 'Encerrado',
  NAO_INICIADO: 'Não iniciado',
};

const statusStyle: Record<StatusCampeonato, string> = {
  EM_ANDAMENTO: 'bg-green-100 text-green-700',
  ENCERRADO: 'bg-gray-100 text-gray-500',
  NAO_INICIADO: 'bg-blue-100 text-blue-700',
};

export function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<CampeonatosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    setLoading(true);
    setErro(null);
    try {
      setData(await api.listarCampeonatos());
    } catch {
      setErro('Não foi possível carregar os campeonatos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  function gerenciar(c: Campeonato) {
    campeonatoAtivo.set({ id: c.id, nome: c.nome });
    navigate('/dashboard/times');
  }

  async function excluir(c: Campeonato) {
    if (!confirm(`Excluir o campeonato "${c.nome}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await api.excluirCampeonato(c.id);
      carregar();
    } catch {
      alert('Não foi possível excluir o campeonato');
    }
  }

  const campeonatos = data?.campeonatos ?? [];
  const stats = [
    { label: 'Total', value: data?.stats.total ?? 0, icon: Trophy, color: 'text-gray-700', bg: 'bg-gray-100' },
    { label: 'Em andamento', value: data?.stats.emAndamento ?? 0, icon: TrendingUp, color: 'text-green-700', bg: 'bg-green-100' },
    { label: 'Não iniciados', value: data?.stats.naoIniciados ?? 0, icon: Clock, color: 'text-blue-700', bg: 'bg-blue-100' },
    { label: 'Encerrados', value: data?.stats.encerrados ?? 0, icon: CheckCircle, color: 'text-gray-500', bg: 'bg-gray-100' },
  ];

  return (
    <OrganizerLayout>
      <div className="p-8 pb-24">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-gray-900 font-bold">Meus Campeonatos</h1>
            <p className="text-gray-500 text-sm mt-0.5">{campeonatos.length} campeonatos cadastrados</p>
          </div>
          <Button
            className="text-white gap-2 bg-green-600 hover:bg-green-700"
            onClick={() => navigate('/dashboard/novo')}
          >
            <Plus className="w-4 h-4" />
            Novo Campeonato
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className={`mt-0.5 text-2xl font-bold leading-[1.2] ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-gray-900 font-semibold">Lista de Campeonatos</h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
            </div>
          ) : erro ? (
            <div className="py-16 text-center text-sm text-red-500">{erro}</div>
          ) : campeonatos.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-500">
              Você ainda não tem campeonatos. Clique em <span className="font-medium">Novo Campeonato</span> para começar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                  <TableHead className="text-gray-500 text-xs uppercase tracking-wide font-semibold">Nome</TableHead>
                  <TableHead className="text-gray-500 text-xs uppercase tracking-wide font-semibold">Formato</TableHead>
                  <TableHead className="text-gray-500 text-xs uppercase tracking-wide font-semibold">Times</TableHead>
                  <TableHead className="text-gray-500 text-xs uppercase tracking-wide font-semibold">Status</TableHead>
                  <TableHead className="text-gray-500 text-xs uppercase tracking-wide text-right font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campeonatos.map(champ => (
                  <TableRow key={champ.id} className="hover:bg-gray-50">
                    <TableCell className="text-gray-900 font-medium">{champ.nome}</TableCell>
                    <TableCell className="text-gray-600 text-sm">{formatoLabel[champ.formato]}</TableCell>
                    <TableCell className="text-gray-600 text-sm">{champ.qtdTimes}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs ${statusStyle[champ.status]}`}>
                        {statusLabel[champ.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/campeonato/${champ.id}`)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Ver página pública"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => gerenciar(champ)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                          title="Gerenciar (times, jogadores, rodadas)"
                        >
                          <Settings2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => excluir(champ)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Excluir"
                        >
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
