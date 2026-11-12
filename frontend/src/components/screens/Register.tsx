import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Logo } from '../Logo';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../lib/useAuth';

export function Register() {
  const navigate = useNavigate();
  const { entrar } = useAuth();
  const [nome, setNome] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      setErro('Username: 3–20 caracteres, só letras minúsculas, números e _');
      return;
    }
    if (senha.length < 8) { setErro('Senha precisa de pelo menos 8 caracteres'); return; }
    if (senha !== confirmar) { setErro('As senhas não conferem'); return; }
    setLoading(true);
    try {
      const resp = await api.register({ nome, email, senha, username });
      entrar(resp);
      navigate('/');
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível criar a conta');
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
            Monte seu campeonato numa tarde.
          </p>
          <p className="mt-4 text-background/60 leading-relaxed text-sm">
            Cadastra os times, gera a tabela, abre a súmula no celular. Sem cartão de crédito.
          </p>
        </div>

        <p className="text-xs text-background/40">placar/io · Ouro Preto</p>
      </aside>

      <section className="flex flex-col justify-center px-6 py-10 lg:px-12 lg:py-12">
        <div className="flex lg:hidden items-center justify-center mb-8">
          <Logo size="md" />
        </div>

        <div className="w-full max-w-sm mx-auto">
          <p className="text-sm text-muted-foreground mb-2">Criar conta</p>
          <h1 className="font-display text-3xl mb-10">Comece seu campeonato</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            {erro && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {erro}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="nome">Seu nome</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>

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
              />
              <p className="text-xs text-muted-foreground">3–20 caracteres, letras, números e _</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input id="senha" type="password" placeholder="Mínimo 8 caracteres" value={senha} onChange={(e) => setSenha(e.target.value)} required autoComplete="new-password" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Repetir senha</Label>
              <Input id="confirm" type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required autoComplete="new-password" />
            </div>

            <Button type="submit" disabled={loading} size="lg" className="w-full">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar conta
            </Button>
          </form>

          <p className="mt-8 text-sm text-muted-foreground">
            Já tem conta?{' '}
            <button onClick={() => navigate('/login')} className="text-foreground underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground">
              Entrar
            </button>
          </p>
        </div>
      </section>
    </div>
  );
}
