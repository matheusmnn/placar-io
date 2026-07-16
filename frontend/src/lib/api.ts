
const BASE_URL = (import.meta.env.VITE_API_URL as string) ?? 'http://localhost:8080/api';

const TOKEN_KEY = 'placar.token';
const USER_KEY = 'placar.user';

export type Formato = 'PONTOS_CORRIDOS' | 'MATA_MATA';
export type StatusCampeonato = 'NAO_INICIADO' | 'EM_ANDAMENTO' | 'ENCERRADO';
export type StatusPartida = 'AGENDADA' | 'EM_ANDAMENTO' | 'CONCLUIDA';
export type Posicao = 'GOLEIRO' | 'ZAGUEIRO' | 'LATERAL' | 'VOLANTE' | 'MEIA' | 'ATACANTE';
export type TipoCartao = 'AMARELO' | 'VERMELHO';

export interface Usuario { id: number; nome: string; email: string; }
export interface AuthResponse { token: string; usuario: Usuario; }

export interface Campeonato {
  id: number;
  nome: string;
  formato: Formato;
  status: StatusCampeonato;
  pontosVitoria: number;
  pontosEmpate: number;
  idaVolta: boolean;
  dataInicio: string | null;
  dataFim: string | null;
  descricao: string | null;
  logoUrl: string | null;
  qtdTimes: number;
}

export interface CampeonatosResponse {
  stats: { total: number; emAndamento: number; naoIniciados: number; encerrados: number };
  campeonatos: Campeonato[];
}

export interface Time { id: number; campeonatoId: number; nome: string; cidade: string | null; escudoUrl: string | null; }
export interface Jogador { id: number; timeId: number; numero: number | null; nome: string; posicao: Posicao | null; }
export interface TimeResumo { id: number; nome: string; escudoUrl: string | null; }

export interface Partida {
  id: number;
  rodada: number;
  fase: string | null;
  ordemFase: number | null;
  status: StatusPartida;
  dataPartida: string | null;
  local: string | null;
  mandante: TimeResumo | null;
  visitante: TimeResumo | null;
  golsMandante: number | null;
  golsVisitante: number | null;
}

export interface Rodada { titulo: string; partidas: Partida[]; }

export interface GolEvento { id: number; timeId: number; jogadorId: number | null; jogadorNome: string | null; minuto: number | null; }
export interface CartaoEvento { id: number; timeId: number; jogadorId: number | null; jogadorNome: string | null; tipo: TipoCartao; minuto: number | null; }
export interface PartidaDetalhe { partida: Partida; gols: GolEvento[]; cartoes: CartaoEvento[]; }

export interface ClassificacaoLinha {
  posicao: number; timeId: number; nome: string; escudoUrl: string | null;
  pontos: number; jogos: number; vitorias: number; empates: number; derrotas: number;
  golsPro: number; golsContra: number; saldo: number;
}

export interface Artilheiro { jogadorId: number; jogadorNome: string; timeId: number; timeNome: string; escudoUrl: string | null; gols: number; }

export interface CampeonatoPublico {
  id: number; nome: string; formato: Formato; status: StatusCampeonato;
  logoUrl: string | null; descricao: string | null;
  qtdTimes: number; totalPartidas: number; partidasJogadas: number;
  rodadasTotais: number; rodadasJogadas: number; totalGols: number;
}

export interface CampeonatoResumoPublico {
  id: number; nome: string; formato: Formato; status: StatusCampeonato;
  dataInicio: string | null; dataFim: string | null; qtdTimes: number;
}

function tokenExpiraEmMs(token: string): number | null {
  try {
    const payloadB64 = token.split('.')[1];
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function tokenValido(token: string | null): token is string {
  if (!token) return false;
  const exp = tokenExpiraEmMs(token);

  return exp === null || exp > Date.now();
}

let onUnauthorized: (() => void) | null = null;
export function registrarOnUnauthorized(fn: () => void) { onUnauthorized = fn; }

export const auth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  getUser: (): Usuario | null => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Usuario;
    } catch {
      return null;
    }
  },
  save: (r: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, r.token);
    localStorage.setItem(USER_KEY, JSON.stringify(r.usuario));
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  isLogged: () => tokenValido(localStorage.getItem(TOKEN_KEY)),
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) };
  const token = auth.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && !path.startsWith('/public') && !path.startsWith('/auth')) {
    auth.clear();
    onUnauthorized?.();
  }
  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const body = await res.json();
      message = body.message || message;
    } catch {  }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const body = (data: unknown) => JSON.stringify(data);

export const api = {

  register: (data: { nome: string; email: string; senha: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: body(data) }),
  login: (data: { email: string; senha: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: body(data) }),

  listarCampeonatos: () => request<CampeonatosResponse>('/campeonatos'),
  obterCampeonato: (id: number) => request<Campeonato>(`/campeonatos/${id}`),
  criarCampeonato: (data: Partial<Campeonato>) =>
    request<Campeonato>('/campeonatos', { method: 'POST', body: body(data) }),
  atualizarCampeonato: (id: number, data: Partial<Campeonato>) =>
    request<Campeonato>(`/campeonatos/${id}`, { method: 'PUT', body: body(data) }),
  excluirCampeonato: (id: number) =>
    request<void>(`/campeonatos/${id}`, { method: 'DELETE' }),

  listarTimes: (campeonatoId: number) => request<Time[]>(`/campeonatos/${campeonatoId}/times`),
  criarTime: (campeonatoId: number, data: { nome: string; cidade?: string; escudoUrl?: string }) =>
    request<Time>(`/campeonatos/${campeonatoId}/times`, { method: 'POST', body: body(data) }),
  atualizarTime: (timeId: number, data: { nome: string; cidade?: string; escudoUrl?: string }) =>
    request<Time>(`/times/${timeId}`, { method: 'PUT', body: body(data) }),
  excluirTime: (timeId: number) => request<void>(`/times/${timeId}`, { method: 'DELETE' }),

  listarJogadores: (timeId: number) => request<Jogador[]>(`/times/${timeId}/jogadores`),
  criarJogador: (timeId: number, data: { numero?: number; nome: string; posicao?: Posicao }) =>
    request<Jogador>(`/times/${timeId}/jogadores`, { method: 'POST', body: body(data) }),
  atualizarJogador: (jogadorId: number, data: { numero?: number; nome: string; posicao?: Posicao }) =>
    request<Jogador>(`/jogadores/${jogadorId}`, { method: 'PUT', body: body(data) }),
  excluirJogador: (jogadorId: number) => request<void>(`/jogadores/${jogadorId}`, { method: 'DELETE' }),

  gerarRodadas: (campeonatoId: number) =>
    request<Rodada[]>(`/campeonatos/${campeonatoId}/gerar-rodadas`, { method: 'POST' }),
  listarPartidas: (campeonatoId: number) => request<Rodada[]>(`/campeonatos/${campeonatoId}/partidas`),
  obterPartida: (partidaId: number) => request<PartidaDetalhe>(`/partidas/${partidaId}`),
  registrarResultado: (partidaId: number, data: {
    golsMandante: number; golsVisitante: number;
    gols?: { timeId: number; jogadorId?: number; minuto?: number }[];
    cartoes?: { timeId: number; jogadorId?: number; tipo: TipoCartao; minuto?: number }[];
  }) => request<PartidaDetalhe>(`/partidas/${partidaId}/resultado`, { method: 'PUT', body: body(data) }),

  publicoListar: () => request<CampeonatoResumoPublico[]>('/public/campeonatos'),
  publicoCampeonato: (id: number) => request<CampeonatoPublico>(`/public/campeonatos/${id}`),
  publicoClassificacao: (id: number) => request<ClassificacaoLinha[]>(`/public/campeonatos/${id}/classificacao`),
  publicoArtilharia: (id: number) => request<Artilheiro[]>(`/public/campeonatos/${id}/artilharia`),
  publicoRodadas: (id: number) => request<Rodada[]>(`/public/campeonatos/${id}/rodadas`),
};
