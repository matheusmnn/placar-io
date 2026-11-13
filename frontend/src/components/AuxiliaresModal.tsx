import { useState } from 'react';
import { Trash2, Plus, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { api, ApiError, Usuario } from '../lib/api';

export function AuxiliaresModal({
  partidaId, auxiliaresAtuais, onClose, onChanged,
}: {
  partidaId: number;
  auxiliaresAtuais: Usuario[];
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const [ident, setIdent] = useState('');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function adicionar() {
    const v = ident.trim();
    if (!v) return;
    setBusy(true);
    setErro(null);
    try {
      await api.adicionarAuxiliar(partidaId, v);
      setIdent('');
      await onChanged();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Falha ao adicionar');
    } finally {
      setBusy(false);
    }
  }

  async function remover(usuarioId: number) {
    setBusy(true);
    setErro(null);
    try {
      await api.removerAuxiliar(partidaId, usuarioId);
      await onChanged();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Falha ao remover');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quem preenche a súmula</DialogTitle>
          <DialogDescription>
            Adicione árbitros ou auxiliares por email ou username. Eles poderão abrir a súmula desta partida.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Pessoas liberadas</p>
            {auxiliaresAtuais.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ninguém adicionado ainda.</p>
            ) : (
              <ul className="space-y-1">
                {auxiliaresAtuais.map((a) => (
                  <li key={a.id} className="flex items-center justify-between bg-muted rounded-md px-3 py-2 text-sm">
                    <span className="truncate">
                      <span className="font-medium">{a.nome}</span>
                      <span className="text-muted-foreground"> · {a.username ? '@' + a.username : a.email}</span>
                    </span>
                    <button onClick={() => remover(a.id)} disabled={busy} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Adicionar por email ou username</p>
            <div className="flex gap-2">
              <Input
                value={ident}
                onChange={(e) => setIdent(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') adicionar(); }}
                placeholder="juiz@email.com ou @username"
                disabled={busy}
              />
              <Button onClick={adicionar} disabled={busy || !ident.trim()}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Adicionar
              </Button>
            </div>
            {erro && <p className="text-xs text-destructive">{erro}</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
