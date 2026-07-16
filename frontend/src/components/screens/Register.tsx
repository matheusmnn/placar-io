import { useState } from 'react';
import { useNavigate } from 'react-router';
import { User, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Logo } from '../Logo';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../lib/useAuth';

export function Register() {
  const navigate = useNavigate();
  const { entrar } = useAuth();
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha.length < 8) { setErro('A senha deve ter pelo menos 8 caracteres'); return; }
    if (senha !== confirmar) { setErro('As senhas nao conferem'); return; }
    setLoading(true);
    try {
      const resp = await api.register({ nome, email, senha });
      entrar(resp);
      navigate('/dashboard');
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Nao foi possivel criar a conta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
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
          <p className="text-gray-500 text-sm">Crie sua conta gratuitamente</p>
        </div>

        <Card className="shadow-sm border-gray-200">
          <CardContent className="pt-8 pb-8 px-8 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-5">
            <h2 className="text-gray-900 text-center mb-6 text-xl font-semibold">
              Criar conta
            </h2>

            {erro && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                {erro}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input id="name" type="text" placeholder="Seu nome completo" className="pl-10"
                  value={nome} onChange={e => setNome(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input id="email" type="email" placeholder="seu@email.com" className="pl-10"
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
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

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repita a senha"
                  className="pl-10 pr-10"
                  value={confirmar}
                  onChange={e => setConfirmar(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full text-white h-10 gap-2 bg-green-600 hover:bg-green-700"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Cadastrar
            </Button>
            </form>

            <p className="text-center text-sm text-gray-500 pt-1">
              Já tem uma conta?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-green-600 font-medium hover:underline"
              >
                Entrar
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}