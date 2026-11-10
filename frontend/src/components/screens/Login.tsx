import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Logo } from '../Logo';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../lib/useAuth';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const voltarPara = (location.state as { from?: string } | null)?.from ?? '/';
  const { entrar } = useAuth();
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
      navigate(voltarPara);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível entrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1fr] bg-background relative">
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 z-10 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground lg:text-background/70 lg:hover:text-background"
        aria-label="Voltar"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <aside className="panel-dark hidden lg:flex flex-col justify-between p-10">
        <div className="pl-20">
          <Logo size="md" tone="light" />
        </div>

        <div>
          <p className="font-display text-3xl text-background leading-tight">
            Rodadas, súmula e tabela num lugar só.
          </p>
          <p className="mt-4 text-background/60 leading-relaxed text-sm">
            O grupo acompanha pelo link público. Você fecha a súmula, a classificação atualiza sozinha.
          </p>
        </div>

        <p className="text-xs text-background/40">placar/io · Ouro Preto</p>
      </aside>

      <section className="flex flex-col justify-center px-6 py-10 lg:px-12 lg:py-12">
        <div className="flex lg:hidden items-center justify-center mb-8">
          <Logo size="md" />
        </div>

        <div className="w-full max-w-sm mx-auto">
          <p className="text-sm text-muted-foreground mb-2">Entrar</p>
          <h1 className="font-display text-3xl mb-10">Continue de onde parou</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            {erro && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {erro}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required autoComplete="current-password" />
              <div className="flex justify-end">
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground">
                  Esqueci minha senha
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} size="lg" className="w-full">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>

          <p className="mt-8 text-sm text-muted-foreground">
            Primeira vez por aqui?{' '}
            <button onClick={() => navigate('/cadastro', { state: { from: voltarPara } })} className="text-foreground underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground">
              Criar conta
            </button>
          </p>
        </div>
      </section>
    </div>
  );
}
