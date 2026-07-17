import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Calendar, Users, Trophy, ArrowRight, Loader2, Search, LayoutDashboard } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Logo } from '../Logo';
import { api, CampeonatoResumoPublico, Formato, StatusCampeonato } from '../../lib/api';
import { useAuth } from '../../lib/useAuth';

const formatoLabel: Record<Formato, string> = { PONTOS_CORRIDOS: 'Pontos Corridos', MATA_MATA: 'Mata-Mata' };
const statusLabel: Record<StatusCampeonato, string> = { EM_ANDAMENTO: 'Em andamento', ENCERRADO: 'Encerrado', NAO_INICIADO: 'Não iniciado' };
const statusStyle: Record<StatusCampeonato, string> = {
  EM_ANDAMENTO: 'bg-green-100 text-green-700',
  NAO_INICIADO: 'bg-blue-100 text-blue-700',
  ENCERRADO: 'bg-gray-100 text-gray-500',
};

function formatarData(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

function semAcento(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export function PublicHome() {
  const navigate = useNavigate();
  const { isLogged } = useAuth();
  const [campeonatos, setCampeonatos] = useState<CampeonatoResumoPublico[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    api.publicoListar()
      .then(setCampeonatos)
      .catch(() => setCampeonatos([]))
      .finally(() => setLoading(false));
  }, []);

  const filtrados = campeonatos.filter(c => semAcento(c.nome).includes(semAcento(busca.trim())));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity">
            <Logo size="md" />
          </button>
          <nav className="flex items-center gap-3">
            {isLogged ? (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
                onClick={() => navigate('/dashboard')}
              >
                <LayoutDashboard className="w-4 h-4" />
                Meu painel
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
                  Entrar
                </Button>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => navigate('/cadastro')}
                >
                  Cadastrar
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="bg-white border-b border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-8">
          <h1 className="text-gray-900 mb-3 text-[2.25rem] font-bold leading-[1.2]">
            Campeonatos
          </h1>
          <p className="text-gray-500 text-[1.0625rem]">
            Acompanhe resultados, classificação e artilharia dos campeonatos de futebol amador.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-8 py-10 pb-24">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">
            {loading ? 'Carregando...' : `${filtrados.length} campeonato${filtrados.length === 1 ? '' : 's'}`}
          </p>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar campeonato..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-green-600"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando campeonatos...
          </div>
        ) : campeonatos.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-16 px-8 text-center">
            <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 font-semibold">Nenhum campeonato ainda</p>
            <p className="text-gray-500 text-sm mt-1">
              {isLogged
                ? 'Crie o primeiro campeonato no seu painel.'
                : 'Crie uma conta para organizar o seu primeiro campeonato.'}
            </p>
            <Button
              className="mt-5 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => navigate(isLogged ? '/dashboard/novo' : '/cadastro')}
            >
              {isLogged ? 'Criar campeonato' : 'Criar conta'}
            </Button>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-16 px-8 text-center">
            <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 font-semibold">Nenhum campeonato encontrado</p>
            <p className="text-gray-500 text-sm mt-1">Nada corresponde a “{busca.trim()}”.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {filtrados.map(champ => (
              <Card key={champ.id} className="overflow-hidden hover:shadow-md transition-shadow border-gray-200">
                <div className="h-1.5 bg-green-600" />
                <CardHeader className="pb-2 pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-gray-900 leading-snug text-base font-semibold">
                      {champ.nome}
                    </CardTitle>
                    <Badge variant="secondary" className={`shrink-0 text-xs ${statusStyle[champ.status]}`}>
                      {statusLabel[champ.status]}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pb-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Trophy className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{formatoLabel[champ.formato]}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{champ.qtdTimes} times</span>
                  </div>
                  {(champ.dataInicio || champ.dataFim) && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>
                        {formatarData(champ.dataInicio) ?? '—'}
                        {champ.dataFim ? ` — ${formatarData(champ.dataFim)}` : ''}
                      </span>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="border-t border-gray-100 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-green-700 border-green-200 hover:bg-green-50"
                    onClick={() => navigate(`/campeonato/${champ.id}`)}
                  >
                    Ver detalhes
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-gray-200 bg-white py-6 mt-8">
        <div className="max-w-7xl mx-auto px-8 flex items-center justify-between">
          <Logo size="sm" />
          <p className="text-xs text-gray-400">© Placar.io — Gestão de campeonatos amadores</p>
        </div>
      </footer>
    </div>
  );
}
