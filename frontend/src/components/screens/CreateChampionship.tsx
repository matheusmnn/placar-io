import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { OrganizerLayout } from '../OrganizerLayout';
import { api, ApiError, Formato } from '../../lib/api';

export function CreateChampionship() {
  const navigate = useNavigate();
  const [format, setFormat] = useState<'pontos-corridos' | 'mata-mata'>('pontos-corridos');
  const [nome, setNome] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [pontosVitoria, setPontosVitoria] = useState(3);
  const [pontosEmpate, setPontosEmpate] = useState(1);
  const [descricao, setDescricao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function salvar() {
    setErro(null);
    if (!nome.trim()) { setErro('Informe o nome do campeonato'); return; }
    setLoading(true);
    try {
      const formato: Formato = format === 'pontos-corridos' ? 'PONTOS_CORRIDOS' : 'MATA_MATA';
      await api.criarCampeonato({
        nome: nome.trim(),
        formato,
        pontosVitoria,
        pontosEmpate,
        dataInicio: dataInicio || null,
        dataFim: dataFim || null,
        descricao: descricao || null,
      });
      navigate('/dashboard');
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível salvar o campeonato');
    } finally {
      setLoading(false);
    }
  }

  return (
    <OrganizerLayout>
      <div className="p-8 max-w-2xl pb-24">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Meus Campeonatos
        </button>

        <div className="mb-8">
          <h1 className="text-gray-900 font-bold">Novo Campeonato</h1>
          <p className="text-gray-500 text-sm mt-0.5">Preencha as informações para criar seu campeonato</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-gray-700 text-sm font-semibold">Informações do campeonato</h3>
          </div>

          <div className="p-8 space-y-7">
            {erro && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600 max-w-lg">
                {erro}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="champ-name">
                Nome do Campeonato <span className="text-red-400">*</span>
              </Label>
              <Input id="champ-name" placeholder="Ex: Copa da Amizade 2024" className="max-w-lg"
                value={nome} onChange={e => setNome(e.target.value)} />
            </div>

            <div className="space-y-3">
              <Label>
                Formato do Campeonato <span className="text-red-400">*</span>
              </Label>
              <RadioGroup value={format} onValueChange={v => setFormat(v as typeof format)}>
                <div className="flex gap-4">
                  {([
                    {
                      value: 'pontos-corridos' as const,
                      label: 'Pontos Corridos',
                      desc: 'Todos os times se enfrentam. Vence quem somar mais pontos.',
                    },
                    {
                      value: 'mata-mata' as const,
                      label: 'Mata-Mata',
                      desc: 'Eliminação direta. O perdedor é eliminado do campeonato.',
                    },
                  ] as const).map(opt => (
                    <label
                      key={opt.value}
                      htmlFor={opt.value}
                      className={`flex-1 flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        format === opt.value ? 'border-green-600 bg-green-50' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <RadioGroupItem value={opt.value} id={opt.value} className="mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-900 font-medium">{opt.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label className="block mb-3">Datas do Campeonato <span className="text-red-400">*</span></Label>
              <div className="grid grid-cols-2 gap-4 max-w-lg">
                <div className="space-y-2">
                  <Label htmlFor="start-date" className="text-xs text-gray-500 font-normal">Data de início</Label>
                  <Input id="start-date" type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date" className="text-xs text-gray-500 font-normal">Data de término</Label>
                  <Input id="end-date" type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <Label className="block mb-1">Pontuação</Label>
              <p className="text-xs text-gray-400 mb-3">Defina quantos pontos cada resultado vale</p>
              <div className="grid grid-cols-2 gap-4 max-w-xs">
                <div className="space-y-2">
                  <Label htmlFor="win-pts" className="text-xs text-gray-600 font-normal">Vitória</Label>
                  <Input id="win-pts" type="number" min={0} max={10}
                    value={pontosVitoria} onChange={e => setPontosVitoria(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="draw-pts" className="text-xs text-gray-600 font-normal">Empate</Label>
                  <Input id="draw-pts" type="number" min={0} max={10}
                    value={pontosEmpate} onChange={e => setPontosEmpate(Number(e.target.value))} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">
                Descrição / Regulamento{' '}
                <span className="text-gray-400 text-xs font-normal">(opcional)</span>
              </Label>
              <textarea
                id="desc"
                rows={4}
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder="Adicione regras específicas, informações sobre premiação, local dos jogos..."
                className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:border-green-600 transition-colors"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="outline" onClick={() => navigate('/dashboard')} disabled={loading}>
                Cancelar
              </Button>
              <Button
                className="text-white px-6 gap-2 bg-green-600 hover:bg-green-700"
                onClick={salvar}
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Salvar Campeonato
              </Button>
            </div>
          </div>
        </div>
      </div>
    </OrganizerLayout>
  );
}
