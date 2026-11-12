import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Logo } from '../Logo';
import { api, ApiError, auth } from '../../lib/api';
import { useAuth } from '../../lib/useAuth';

export function EscolherUsername() {
  const navigate = useNavigate();
  const { atualizarUsuario, sair } = useAuth();
  const [username, setUsername] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      setErro('Username: 3–20 caracteres, só letras minúsculas, números e _');
      return;
    }
    setLoading(true);
    try {
      const { usuario } = await api.escolherUsername(username);
      const token = auth.getToken();
      if (token) auth.save({ token, usuario });
      atualizarUsuario(usuario);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível salvar o username');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Logo size="md" />
        </div>
        <p className="text-sm text-muted-foreground mb-2">Escolha seu username</p>
        <h1 className="font-display text-2xl mb-6">Como você quer ser identificado?</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Esse é o nome público que outros organizadores usam pra te convidar como co-adm.
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          {erro && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erro}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="ex.: joao_silva"
              maxLength={20}
              autoComplete="username"
              required
              autoFocus
            />
            <p className="text-xs text-muted-foreground">3–20 caracteres, letras, números e _</p>
          </div>
          <Button type="submit" disabled={loading} size="lg" className="w-full">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
          <button
            type="button"
            onClick={sair}
            className="block mx-auto text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Sair da conta
          </button>
        </form>
      </div>
    </div>
  );
}
