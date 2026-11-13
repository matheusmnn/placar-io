import { useState } from 'react';
import { Undo2, Trash2, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { api, ApiError, PenaltiCobranca, TimeResumo } from '../lib/api';

type Props = {
  partidaId: number;
  serie: PenaltiCobranca[] | null;
  mandante: Pick<TimeResumo, 'id' | 'nome'>;
  visitante: Pick<TimeResumo, 'id' | 'nome'>;
  onSaved: () => void | Promise<void>;
};

export function PenaltisEditor({ partidaId, serie, mandante, visitante, onSaved }: Props) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const atual = serie ?? [];
  const totM = atual.filter((s) => s.time === 'M' && s.converteu).length;
  const totV = atual.filter((s) => s.time === 'V' && s.converteu).length;
  const dotsM = atual.filter((s) => s.time === 'M');
  const dotsV = atual.filter((s) => s.time === 'V');

  async function salvar(novo: PenaltiCobranca[] | null) {
    setSalvando(true);
    setErro(null);
    try {
      await api.salvarPenaltisSerie(partidaId, novo);
      await onSaved();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Falha ao salvar pênalti');
    } finally {
      setSalvando(false);
    }
  }

  const adicionar = (time: 'M' | 'V', converteu: boolean) => salvar([...atual, { time, converteu }]);
  const desfazer = () => salvar(atual.slice(0, -1));
  const limpar = () => salvar(null);

  return (
    <div className="space-y-3">
      {erro && <p className="text-xs text-destructive">{erro}</p>}

      <div className="rounded-md border border-border p-3 space-y-2">
        <LinhaTime nome={mandante.nome} dots={dotsM} total={totM} />
        <LinhaTime nome={visitante.nome} dots={dotsV} total={totV} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground text-center">{mandante.nome}</p>
          <div className="flex gap-1">
            <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={salvando} onClick={() => adicionar('M', true)}>Converteu</Button>
            <Button size="sm" variant="outline" className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10" disabled={salvando} onClick={() => adicionar('M', false)}>Errou</Button>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground text-center">{visitante.nome}</p>
          <div className="flex gap-1">
            <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={salvando} onClick={() => adicionar('V', true)}>Converteu</Button>
            <Button size="sm" variant="outline" className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10" disabled={salvando} onClick={() => adicionar('V', false)}>Errou</Button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" disabled={salvando || atual.length === 0} onClick={desfazer}>
          <Undo2 className="w-3 h-3" /> Desfazer
        </Button>
        <Button size="sm" variant="ghost" disabled={salvando || atual.length === 0} onClick={limpar}>
          <Trash2 className="w-3 h-3" /> Limpar
        </Button>
        {salvando && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground self-center" />}
      </div>
    </div>
  );
}

function LinhaTime({ nome, dots, total }: { nome: string; dots: PenaltiCobranca[]; total: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm flex-1 truncate">{nome}</span>
      <div className="flex gap-1 flex-wrap justify-end">
        {dots.length === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          dots.map((d, i) => (
            <span
              key={i}
              className={`w-3 h-3 rounded-full ${d.converteu ? 'bg-emerald-500' : 'bg-destructive'}`}
              title={d.converteu ? 'Converteu' : 'Errou'}
            />
          ))
        )}
      </div>
      <span className="font-scoreboard text-lg w-6 text-center">{total}</span>
    </div>
  );
}
