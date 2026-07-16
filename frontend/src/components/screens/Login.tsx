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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-16">
      <button
        onClick={() => navigate('/')}
        className="text-sm text-gray-500 hover:text-gray-700 mb-8 flex items-center gap-1 self-start max-w-md w-full mx-auto"
      >
        ← Voltar ao início
      </button>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Logo size="lg" />
          </div>
          <p className="text-gray-500 text-sm">Gerencie seus campeonatos com facilidade</p>
        </div>

        <Card className="shadow-sm border-gray-200">
          <CardContent className="pt-8 pb-8 px-8 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-5">
            <h2 className="text-gray-900 text-center mb-6 text-xl font-semibold">
              Entre na sua conta
            </h2>

            {erro && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                {erro}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input id="email" type="email" placeholder="seu@email.com" className="pl-10"
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <button type="button" className="text-xs text-green-600 hover:underline">
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full text-white h-10 mt-2 gap-2 bg-green-600 hover:bg-green-700"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Entrar
            </Button>
            </form>

            <p className="text-center text-sm text-gray-500 pt-2">
              Não tem uma conta?{' '}
              <button
                onClick={() => navigate('/cadastro')}
                className="text-green-600 font-medium hover:underline"
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