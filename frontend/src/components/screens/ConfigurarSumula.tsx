import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Loader2, Plus, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { OrganizerLayout } from '../OrganizerLayout';
import {
  api, ApiError, CampoCustom, CampoCustomTipo, SUBSECOES, SumulaConfig, SumulaSecao,
} from '../../lib/api';
import { campeonatoAtivo } from '../../lib/session';

const SECOES: { id: SumulaSecao; label: string; desc: string }[] = [
  { id: 'arbitragem', label: 'Arbitragem', desc: 'Árbitros, assistentes, VAR e auxiliares.' },
  { id: 'escalacao', label: 'Escalação', desc: 'Titulares e reservas dos times.' },
  { id: 'cronologia', label: 'Cronologia', desc: 'Entradas em campo e tempos de jogo.' },
  { id: 'gols', label: 'Gols', desc: 'Lista granular de gols.' },
  { id: 'cartoes', label: 'Cartões', desc: 'Lista granular de cartões.' },
  { id: 'placar', label: 'Placar', desc: 'Encerramento da partida.' },
  { id: 'observacoes', label: 'Observações', desc: 'Ocorrências e relatórios.' },
];

const TIPOS: { id: CampoCustomTipo; label: string }[] = [
  { id: 'texto', label: 'Texto' },
  { id: 'numero', label: 'Número' },
  { id: 'boolean', label: 'Sim / Não' },
];

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'campo';
}

export function ConfigurarSumula() {
  const navigate = useNavigate();
  const ativo = campeonatoAtivo.get();

  const [config, setConfig] = useState<SumulaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [novoLabel, setNovoLabel] = useState('');
  const [novoTipo, setNovoTipo] = useState<CampoCustomTipo>('texto');

  useEffect(() => {
    if (!ativo) { setLoading(false); return; }
    api.obterSumulaConfig(ativo.id)
      .then((c) => setConfig(c))
      .catch(() => setErro('Não foi possível carregar a configuração'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setSecao(id: SumulaSecao, ativo: boolean) {
    if (!config) return;
    setConfig({ ...config, secoes: { ...config.secoes, [id]: ativo } });
  }

  function setSub(secao: SumulaSecao, sub: string, ativo: boolean) {
    if (!config) return;
    setConfig({ ...config, subsecoes: { ...config.subsecoes, [`${secao}.${sub}`]: ativo } });
  }

  function adicionarCampo() {
    if (!config) return;
    const label = novoLabel.trim();
    if (!label) return;
    const baseId = slugify(label);
    const existentes = new Set(config.camposCustom.map((c) => c.id));
    let id = baseId;
    let i = 2;
    while (existentes.has(id)) { id = `${baseId}-${i++}`; }
    const novo: CampoCustom = { id, label, tipo: novoTipo };
    setConfig({ ...config, camposCustom: [...config.camposCustom, novo] });
    setNovoLabel('');
    setNovoTipo('texto');
  }

  function removerCampo(id: string) {
    if (!config) return;
    setConfig({ ...config, camposCustom: config.camposCustom.filter((c) => c.id !== id) });
  }

  async function salvar() {
    if (!config || !ativo) return;
    setErro(null); setOk(false); setSalvando(true);
    try {
      const salva = await api.salvarSumulaConfig(ativo.id, config);
      setConfig(salva);
      setOk(true);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  if (!ativo) {
    return (
      <OrganizerLayout>
        <div className="p-10 max-w-3xl">
          <p className="text-sm text-muted-foreground">Nenhum campeonato selecionado.</p>
          <Button className="mt-4" onClick={() => navigate('/dashboard')}>Voltar ao painel</Button>
        </div>
      </OrganizerLayout>
    );
  }

  return (
    <OrganizerLayout>
      <div className="p-10 pb-20 max-w-3xl">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Painel
        </button>
        <p className="text-sm text-muted-foreground">{ativo.nome}</p>
        <h1 className="font-display text-3xl mt-1 mb-2">Configurar súmula</h1>
        <p className="text-sm text-muted-foreground mb-10">
          Defina a súmula padrão deste campeonato. Vale para todas as partidas.
        </p>

        {erro && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive mb-6">
            {erro}
          </div>
        )}

        {loading || !config ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-10">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando
          </div>
        ) : (
          <div className="space-y-10">
            <section>
              <h2 className="font-display text-lg mb-4">Seções</h2>
              <div className="divide-y divide-border border-y border-border">
                {SECOES.map((s) => {
                  const ligada = config.secoes[s.id] !== false;
                  const subs = SUBSECOES.filter((x) => x.secao === s.id);
                  return (
                    <div key={s.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm">{s.label}</p>
                          <p className="text-xs text-muted-foreground">{s.desc}</p>
                        </div>
                        <Switch checked={ligada} onCheckedChange={(v) => setSecao(s.id, v)} />
                      </div>
                      {ligada && subs.length > 0 && (
                        <ul className="mt-3 ml-4 pl-4 border-l border-border space-y-2">
                          {subs.map((sub) => {
                            const subOn = config.subsecoes[`${s.id}.${sub.id}`] !== false;
                            return (
                              <li key={sub.id} className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">{sub.label}</span>
                                <Switch checked={subOn} onCheckedChange={(v) => setSub(s.id, sub.id, v)} />
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="font-display text-lg mb-4">Campos avulsos</h2>
              {config.camposCustom.length === 0 ? (
                <p className="text-sm text-muted-foreground mb-4">Nenhum campo avulso.</p>
              ) : (
                <ul className="divide-y divide-border border-y border-border mb-4">
                  {config.camposCustom.map((c) => (
                    <li key={c.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm">{c.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {TIPOS.find((t) => t.id === c.tipo)?.label} · <code>{c.id}</code>
                        </p>
                      </div>
                      <button
                        onClick={() => removerCampo(c.id)}
                        className="text-muted-foreground hover:text-destructive"
                        title={`Remover ${c.label}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Nome do campo</Label>
                  <Input value={novoLabel} onChange={(e) => setNovoLabel(e.target.value)}
                    placeholder="Ex.: Clima, Público pagante, Renda" />
                </div>
                <div className="space-y-1 w-40">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={novoTipo} onValueChange={(v) => setNovoTipo(v as CampoCustomTipo)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPOS.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" variant="outline" onClick={adicionarCampo} disabled={!novoLabel.trim()}>
                  <Plus className="w-4 h-4" /> Adicionar
                </Button>
              </div>
            </section>

            <div className="flex items-center gap-4">
              <Button onClick={salvar} disabled={salvando}>
                {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar como súmula padrão
              </Button>
              {ok && <span className="text-sm text-muted-foreground">Salvo.</span>}
            </div>
          </div>
        )}
      </div>
    </OrganizerLayout>
  );
}
