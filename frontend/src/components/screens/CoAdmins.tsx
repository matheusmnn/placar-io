import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Loader2, Plus, UserMinus, Pencil } from 'lucide-react';
import { OrganizerLayout } from '../OrganizerLayout';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '../ui/alert-dialog';
import { useAuth } from '../../lib/useAuth';
import { campeonatoAtivo } from '../../lib/session';
import {
  api, ApiError, CoAdm, EscopoCoAdm, Permissoes, UsuarioBusca, permissoesTudoMarcado,
} from '../../lib/api';

const GRUPOS: { titulo: string; escopos: { chave: EscopoCoAdm; label: string; descricao: string }[] }[] = [
  {
    titulo: 'Administração',
    escopos: [
      { chave: 'gerenciar', label: 'Gerenciar campeonato', descricao: 'Editar dados, formato, configurações' },
      { chave: 'excluir', label: 'Excluir campeonato', descricao: 'Apagar o campeonato (irreversível)' },
    ],
  },
  {
    titulo: 'Dados',
    escopos: [
      { chave: 'elenco', label: 'Times e jogadores', descricao: 'Inscrever times, gerenciar grupos' },
      { chave: 'calendario', label: 'Calendário', descricao: 'Criar partidas, sortear, definir árbitros' },
      { chave: 'sumula', label: 'Súmula', descricao: 'Configurar seções da súmula' },
    ],
  },
  {
    titulo: 'Equipe',
    escopos: [
      { chave: 'coAdms', label: 'Gerenciar co-adms', descricao: 'Convidar, editar e remover outros co-adms' },
    ],
  },
];

export function CoAdmins() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const ativo = campeonatoAtivo.get();
  const [coAdms, setCoAdms] = useState<CoAdm[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [convitar, setConvitar] = useState(false);
  const [editando, setEditando] = useState<CoAdm | null>(null);
  const [removendo, setRemovendo] = useState<CoAdm | null>(null);

  const carregar = useCallback(async (id: number) => {
    setLoading(true);
    setErro(null);
    try {
      const lista = await api.listarCoAdms(id);
      setCoAdms(lista);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível carregar os co-adms');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ativo) {
      navigate('/dashboard');
      return;
    }
    carregar(ativo.id);
  }, [ativo, carregar, navigate]);

  if (!ativo) return null;

  const podeGerenciar = coAdms.find((c) => c.usuarioId === usuario?.id)?.permissoes.coAdms
    ?? coAdms.find((c) => c.usuarioId === usuario?.id)?.dono
    ?? false;

  return (
    <OrganizerLayout>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground">{ativo.nome}</p>
            <h1 className="font-display text-2xl">Co-administradores</h1>
          </div>
          {podeGerenciar && (
            <Button onClick={() => setConvitar(true)} size="sm">
              <Plus className="h-4 w-4" /> Convidar co-adm
            </Button>
          )}
        </div>

        {erro && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive mb-4">
            {erro}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <ul className="space-y-3">
            {coAdms.map((c) => (
              <li
                key={c.usuarioId}
                className="rounded-md border bg-card px-4 py-3 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{c.nome}</span>
                    {c.dono && <Badge variant="secondary">Dono</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {c.username ? `@${c.username} · ` : ''}{c.email}
                  </p>
                  {!c.dono && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {GRUPOS.flatMap((g) => g.escopos).filter((e) => c.permissoes[e.chave]).map((e) => (
                        <Badge key={e.chave} variant="outline" className="text-xs">{e.label}</Badge>
                      ))}
                      {!GRUPOS.flatMap((g) => g.escopos).some((e) => c.permissoes[e.chave]) && (
                        <span className="text-xs text-muted-foreground">Sem permissões ativas</span>
                      )}
                    </div>
                  )}
                </div>
                {!c.dono && podeGerenciar && c.usuarioId !== usuario?.id && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditando(c)} aria-label="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setRemovendo(c)} aria-label="Remover">
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {!c.dono && c.usuarioId === usuario?.id && (
                  <Button variant="ghost" size="sm" onClick={() => setRemovendo(c)}>Sair</Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConvidarModal
        aberto={convitar}
        onFechar={() => setConvitar(false)}
        campeonatoId={ativo.id}
        onConvidado={() => { setConvitar(false); carregar(ativo.id); }}
      />

      <EditarModal
        coAdm={editando}
        onFechar={() => setEditando(null)}
        campeonatoId={ativo.id}
        onSalvo={() => { setEditando(null); carregar(ativo.id); }}
      />

      <AlertDialog open={!!removendo} onOpenChange={(open) => !open && setRemovendo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover co-adm?</AlertDialogTitle>
            <AlertDialogDescription>
              {removendo?.usuarioId === usuario?.id
                ? `Você vai sair de ${ativo.nome}. Precisará ser convidado de novo pra voltar.`
                : `${removendo?.nome} deixa de administrar ${ativo.nome}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!removendo) return;
                try {
                  await api.removerCoAdm(ativo.id, removendo.usuarioId);
                  setRemovendo(null);
                  if (removendo.usuarioId === usuario?.id) navigate('/dashboard');
                  else carregar(ativo.id);
                } catch (err) {
                  setErro(err instanceof ApiError ? err.message : 'Falha ao remover');
                  setRemovendo(null);
                }
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OrganizerLayout>
  );
}

function PermissoesEditor({ valor, onChange }: { valor: Permissoes; onChange: (p: Permissoes) => void }) {
  return (
    <div className="space-y-4">
      {GRUPOS.map((g) => (
        <div key={g.titulo}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{g.titulo}</p>
          <div className="space-y-2">
            {g.escopos.map((e) => (
              <label key={e.chave} className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  id={`perm-${e.chave}`}
                  checked={valor[e.chave]}
                  onCheckedChange={(c) => onChange({ ...valor, [e.chave]: c === true })}
                />
                <div className="flex-1">
                  <div className="text-sm">{e.label}</div>
                  <div className="text-xs text-muted-foreground">{e.descricao}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ConvidarModal({
  aberto, onFechar, campeonatoId, onConvidado,
}: {
  aberto: boolean; onFechar: () => void; campeonatoId: number; onConvidado: () => void;
}) {
  const [identificador, setIdentificador] = useState('');
  const [permissoes, setPermissoes] = useState<Permissoes>(permissoesTudoMarcado());
  const [sugestoes, setSugestoes] = useState<UsuarioBusca[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!aberto) {
      setIdentificador('');
      setPermissoes(permissoesTudoMarcado());
      setSugestoes([]);
      setErro(null);
    }
  }, [aberto]);

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const q = identificador.trim().toLowerCase();
    if (q.length < 3 || q.includes('@')) { setSugestoes([]); return; }
    timerRef.current = window.setTimeout(() => {
      api.buscarUsuarios(q).then(setSugestoes).catch(() => setSugestoes([]));
    }, 400);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [identificador]);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      await api.convidarCoAdm(campeonatoId, { identificador: identificador.trim().toLowerCase(), permissoes });
      onConvidado();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Falha ao convidar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Convidar co-adm</DialogTitle>
          <DialogDescription>
            Busca por username (sugestões) ou digita o email completo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submeter} className="space-y-5">
          <div className="space-y-2 relative">
            <Label htmlFor="ident">Username ou email</Label>
            <Input
              id="ident"
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              placeholder="joao_silva ou joao@email.com"
              autoComplete="off"
              required
            />
            {sugestoes.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-popover border rounded-md shadow-sm max-h-60 overflow-auto">
                {sugestoes.map((s) => (
                  <li
                    key={s.usuarioId}
                    className="px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                    onClick={() => { setIdentificador(s.username); setSugestoes([]); }}
                  >
                    <div className="font-medium">@{s.username}</div>
                    <div className="text-xs text-muted-foreground">{s.nome}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <PermissoesEditor valor={permissoes} onChange={setPermissoes} />
          {erro && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erro}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onFechar}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Convidar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditarModal({
  coAdm, onFechar, campeonatoId, onSalvo,
}: {
  coAdm: CoAdm | null; onFechar: () => void; campeonatoId: number; onSalvo: () => void;
}) {
  const [permissoes, setPermissoes] = useState<Permissoes>(permissoesTudoMarcado());
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (coAdm) {
      setPermissoes(coAdm.permissoes);
      setErro(null);
    }
  }, [coAdm]);

  if (!coAdm) return null;

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    if (!coAdm) return;
    setErro(null);
    setLoading(true);
    try {
      await api.editarCoAdm(campeonatoId, coAdm.usuarioId, permissoes);
      onSalvo();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Falha ao salvar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={!!coAdm} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Permissões de {coAdm.nome}</DialogTitle>
          <DialogDescription>
            {coAdm.username ? `@${coAdm.username} · ` : ''}{coAdm.email}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submeter} className="space-y-5">
          <PermissoesEditor valor={permissoes} onChange={setPermissoes} />
          {erro && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erro}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onFechar}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
