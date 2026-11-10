import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Logo } from '../Logo';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../lib/useAuth';

export function Login() {
  const navigate = useNavigate();
  const { entrar } = useAuth();
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      const resp = await api.login({ email, senha });
      entrar(resp);
      navigate('/dashboard');
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Nao foi possivel entrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16">
      <button
        onClick={() => navigate('/')}
        className="text-sm text-muted-foreground hover:text-foreground mb-8 flex items-center gap-1 self-start max-w-md w-full mx-auto"
      >
        ← Voltar ao início
      </button>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Logo size="lg" />
          </div>
          <p className="text-muted-foreground text-sm">Gerencie seus campeonatos com facilidade</p>
        </div>

        <Card className="shadow-sm border-border">
          <CardContent className="pt-8 pb-8 px-8 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-5">
            <h2 className="text-foreground text-center mb-6 text-xl font-semibold">
              Entre na sua conta
            </h2>

            {erro && (
              <div className="rounded-md bg-destructive/10 border border-red-200 px-3 py-2 text-sm text-destructive">
                {erro}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="seu@email.com" className="pl-10"
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <button type="button" className="text-xs text-primary hover:underline">
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full text-white h-10 mt-2 gap-2 bg-primary hover:bg-primary/90"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Entrar
            </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground pt-2">
              Não tem uma conta?{' '}
              <button
                onClick={() => navigate('/cadastro')}
                className="text-primary font-medium hover:underline"
              >
                Criar conta
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}