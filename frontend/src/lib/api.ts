
const BASE_URL = (import.meta.env.VITE_API_URL as string) ?? 'http://localhost:8080/api';

const TOKEN_KEY = 'placar.token';
const USER_KEY = 'placar.user';

export type Formato =
  | 'PONTOS_CORRIDOS'
  | 'MATA_MATA'
  | 'GRUPOS'
  | 'GRUPOS_MATA_MATA'
  | 'PONTOS_CORRIDOS_MATA_MATA';
export type StatusCampeonato = 'NAO_INICIADO' | 'EM_ANDAMENTO' | 'ENCERRADO';
export type StatusPartida = 'AGENDADA' | 'EM_ANDAMENTO' | 'CONCLUIDA';
export type Posicao = 'GOLEIRO' | 'ZAGUEIRO' | 'LATERAL' | 'VOLANTE' | 'MEIA' | 'ATACANTE';
export type TipoCartao = 'AMARELO' | 'VERMELHO';
export type KoDesempate = 'PENALTIS' | 'PRORROGACAO_PENALTIS';
export type TipoGol = 'NORMAL' | 'PENALTI' | 'CONTRA' | 'FALTA';
export type TipoEscalacao = 'TITULAR' | 'RESERVA';
export type Periodo = 'PRIMEIRO_TEMPO' | 'SEGUNDO_TEMPO';
export type FuncaoComissao =
  | 'TECNICO'
  | 'ASSISTENTE_TECNICO'
  | 'MEDICO'
  | 'TREINADOR_GOLEIROS'
  | 'PREPARADOR_FISICO'
  | 'FISIOTERAPEUTA'
  | 'MASSAGISTA';
export type ChaveStat =
  | 'FINALIZACOES'
  | 'FINALIZACOES_NO_GOL'
  | 'ESCANTEIOS'
  | 'FALTAS'
  | 'IMPEDIMENTOS'
  | 'POSSE';
export type CriterioDesempate = 'saldo' | 'golsPro' | 'golsContra' | 'vitorias' | 'sorteio';

export interface PlayoffConfig {
  posicoes: number[];
  chaveamento: [number, number][];
  temFinal?: boolean;
  idaVolta?: boolean;
  desempate?: KoDesempate;
}

export interface FaixaTabela {
  cor: string;
  posInicio: number;
  posFim: number;
  legenda: string;
}

export type SumulaSecao =
  | 'arbitragem' | 'escalacao' | 'cronologia'
  | 'gols' | 'cartoes' | 'placar' | 'observacoes';
export type CampoCustomTipo = 'texto' | 'numero' | 'boolean';
export interface CampoCustom { id: string; label: string; tipo: CampoCustomTipo; }
export interface SumulaConfig {
  secoes: Partial<Record<SumulaSecao, boolean>>;
  subsecoes: Record<string, boolean>;
  camposCustom: CampoCustom[];
}
export const SUBSECOES: { secao: SumulaSecao; id: string; label: string }[] = [
  { secao: 'escalacao',   id: 'titulares',            label: 'Titulares' },
  { secao: 'escalacao',   id: 'reservas',             label: 'Reservas' },
  { secao: 'escalacao',   id: 'substituicoes',        label: 'Substituições' },
  { secao: 'escalacao',   id: 'comissao',             label: 'Comissão técnica' },
  { secao: 'observacoes', id: 'ocorrencias',          label: 'Ocorrências' },
  { secao: 'observacoes', id: 'motivoAtraso',         label: 'Motivo de atraso' },
  { secao: 'observacoes', id: 'observacoesEventuais', label: 'Observações eventuais' },
  { secao: 'observacoes', id: 'relatorioAssistente',  label: 'Relatório do assistente' },
  { secao: 'cronologia',  id: 'entradas',             label: 'Entradas em campo' },
  { secao: 'cronologia',  id: 'tempos',               label: 'Tempos de jogo' },
];
export function subLigada(cfg: SumulaConfig | undefined, secao: SumulaSecao, sub: string): boolean {
  return cfg?.subsecoes?.[`${secao}.${sub}`] !== false;
}
export type CampoCustomValor = string | number | boolean | null;

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
  koDesempate: KoDesempate;
  numGrupos: number | null;
  avancamPorGrupo: number | null;
  criteriosDesempate: CriterioDesempate[] | null;
  playoff: PlayoffConfig | null;
  faixasTabela: FaixaTabela[] | null;
  campeonatoVinculadoId: number | null;
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

export interface Time {
  id: number; usuarioId: number; nome: string;
  cidade: string | null; escudoUrl: string | null;
  cor: string | null; abreviacao: string | null;
  // Presentes quando o time vem via listagem de campeonato:
  grupoId?: number | null;
  inscricaoId?: number;
}

export interface Jogador {
  id: number; timeId: number;
  numero: number | null; nome: string;
  apelido: string | null;
  nomeCompleto: string | null;
  registro: string | null;
  profissional: boolean;
  posicao: Posicao | null;
}

export interface Grupo { id: number; campeonatoId: number; nome: string; times: Time[]; }

export interface TimeResumo {
  id: number; nome: string; escudoUrl: string | null;
  cor?: string | null; abreviacao?: string | null;
}
export interface CampeonatoVinculo { id: number; nome: string; }

export interface Partida {
  id: number;
  rodada: number;
  fase: string | null;
  ordemFase: number | null;
  legOrdem: number | null;
  status: StatusPartida;
  dataPartida: string | null;
  local: string | null;
  transmissao: string | null;
  camposArbitragemOcultos: string[];
  camposCustom: Record<string, CampoCustomValor>;
  campeonatoId: number;
  mandante: TimeResumo | null;
  visitante: TimeResumo | null;
  golsMandante: number | null;
  golsVisitante: number | null;
  prorrogacao: boolean;
  golsMandanteProrr: number | null;
  golsVisitanteProrr: number | null;
  penaltisMandante: number | null;
  penaltisVisitante: number | null;
}

export interface Rodada { titulo: string; partidas: Partida[]; }

export interface GolEvento {
  id: number; timeId: number; jogadorId: number | null;
  jogadorNome: string | null; jogadorApelido?: string | null;
  minuto: number | null; tempoSegundos?: number | null;
  tipo?: TipoGol;
}
export interface CartaoEvento {
  id: number; timeId: number; jogadorId: number | null;
  jogadorNome: string | null; jogadorApelido?: string | null;
  tipo: TipoCartao; minuto: number | null;
  tempoSegundos?: number | null;
  motivoCodigo?: string | null; motivoDescricao?: string | null;
}
export interface Substituicao {
  id: number; timeId: number;
  periodo: Periodo; tempoSegundos: number | null;
  entrou: { id: number; numero: number | null; nome: string };
  saiu: { id: number; numero: number | null; nome: string };
}
export interface EscalacaoEntry {
  jogadorId: number; tipo: TipoEscalacao; timeId: number;
  jogador: Jogador;
}
export interface Arbitragem {
  juiz: Usuario | null;
  assistente1: Usuario | null;
  assistente2: Usuario | null;
  quartoArbitro: Usuario | null;
  var: Usuario | null;
  avar: Usuario | null;
  avar2: Usuario | null;
  observadorVar: Usuario | null;
  auxiliares: Usuario[];
}
export interface Cronologia {
  entradaMandante: string | null; entradaVisitante: string | null;
  inicio1T: string | null; termino1T: string | null; acrescimo1T: number | null;
  inicio2T: string | null; termino2T: string | null; acrescimo2T: number | null;
  placar1TMandante: number | null; placar1TVisitante: number | null;
}
export interface ObservacoesPartida {
  ocorrencias: string | null;
  motivoAtraso: string | null;
  observacoesEventuais: string | null;
  relatorioAssistente: string | null;
}
export interface StatPartida { id: number; timeId: number; chave: ChaveStat; valor: number; }
export interface ArbitroCampeonato {
  id: number;
  email: string;
  nome: string | null;
  usuarioId: number | null;
  status: 'ACEITO' | 'PENDENTE';
}
export interface PartidaDetalhe {
  partida: Partida;
  sumulaConfig: SumulaConfig;
  arbitragem?: Arbitragem;
  cronologia?: Cronologia;
  observacoes?: ObservacoesPartida;
  gols: GolEvento[];
  cartoes: CartaoEvento[];
  escalacao?: EscalacaoEntry[];
  substituicoes?: Substituicao[];
  stats?: StatPartida[];
}

export interface ClassificacaoLinha {
  posicao: number; timeId: number; nome: string; escudoUrl: string | null;
  cor: string | null; abreviacao: string | null;
  pontos: number; jogos: number; vitorias: number; empates: number; derrotas: number;
  golsPro: number; golsContra: number; saldo: number;
}

export interface ClassificacaoGrupo {
  grupoId: number; nome: string; linhas: ClassificacaoLinha[];
}

export interface Artilheiro {
  jogadorId: number; jogadorNome: string;
  timeId: number; timeNome: string;
  escudoUrl: string | null;
  cor: string | null; abreviacao: string | null;
  gols: number;
}

export interface CampeonatoPublico {
  id: number; nome: string; formato: Formato; status: StatusCampeonato;
  logoUrl: string | null; descricao: string | null;
  faixasTabela: FaixaTabela[] | null;
  campeonatoVinculado: CampeonatoVinculo | null;
  vinculados: CampeonatoVinculo[];
  qtdTimes: number; totalPartidas: number; partidasJogadas: number;
  rodadasTotais: number; rodadasJogadas: number; totalGols: number;
}

export interface CampeonatoResumoPublico {
  id: number; nome: string; formato: Formato; status: StatusCampeonato;
  dataInicio: string | null; dataFim: string | null; qtdTimes: number;
}

export interface ComissaoTecnica { id: number; timeId: number; nome: string; funcao: FuncaoComissao; }

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
    try { return JSON.parse(raw) as Usuario; } catch { return null; }
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
    } catch {
      /* body não é JSON ou vazio */
    }
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

  listarGrupos: (campeonatoId: number) =>
    request<Grupo[]>(`/campeonatos/${campeonatoId}/grupos`),

  // Lista times inscritos no campeonato (com grupoId e inscricaoId).
  listarTimes: (campeonatoId: number) => request<Time[]>(`/campeonatos/${campeonatoId}/times`),
  // Cadastro global de times do usuário.
  listarMeusTimes: () => request<Time[]>(`/times`),
  criarTime: (data: { nome: string; cidade?: string | null; escudoUrl?: string | null; cor?: string | null; abreviacao?: string | null }) =>
    request<Time>(`/times`, { method: 'POST', body: body(data) }),
  atualizarTime: (timeId: number, data: { nome: string; cidade?: string | null; escudoUrl?: string | null; cor?: string | null; abreviacao?: string | null }) =>
    request<Time>(`/times/${timeId}`, { method: 'PUT', body: body(data) }),
  excluirTime: (timeId: number) => request<void>(`/times/${timeId}`, { method: 'DELETE' }),
  // Inscrever/desinscrever time em campeonato.
  inscreverTime: (campeonatoId: number, data: { timeId: number; grupoId?: number | null }) =>
    request<{ id: number; campeonatoId: number; timeId: number; grupoId: number | null }>(
      `/campeonatos/${campeonatoId}/inscricoes`, { method: 'POST', body: body(data) },
    ),
  desinscreverTime: (campeonatoId: number, timeId: number) =>
    request<void>(`/campeonatos/${campeonatoId}/inscricoes/${timeId}`, { method: 'DELETE' }),

  listarJogadores: (timeId: number) => request<Jogador[]>(`/times/${timeId}/jogadores`),
  criarJogador: (timeId: number, data: Partial<Jogador>) =>
    request<Jogador>(`/times/${timeId}/jogadores`, { method: 'POST', body: body(data) }),
  atualizarJogador: (jogadorId: number, data: Partial<Jogador>) =>
    request<Jogador>(`/jogadores/${jogadorId}`, { method: 'PUT', body: body(data) }),
  excluirJogador: (jogadorId: number) => request<void>(`/jogadores/${jogadorId}`, { method: 'DELETE' }),

  gerarRodadas: (campeonatoId: number) =>
    request<Rodada[]>(`/campeonatos/${campeonatoId}/gerar-rodadas`, { method: 'POST' }),
  listarPartidas: (campeonatoId: number) => request<Rodada[]>(`/campeonatos/${campeonatoId}/partidas`),
  obterPartida: (partidaId: number) => request<PartidaDetalhe>(`/partidas/${partidaId}`),
  registrarResultado: (partidaId: number, data: {
    golsMandante: number; golsVisitante: number;
    prorrogacao?: boolean;
    golsMandanteProrr?: number | null;
    golsVisitanteProrr?: number | null;
    penaltisMandante?: number | null;
    penaltisVisitante?: number | null;
    gols?: { timeId: number; jogadorId?: number; minuto?: number }[];
    cartoes?: { timeId: number; jogadorId?: number; tipo: TipoCartao; minuto?: number }[];
  }) => request<PartidaDetalhe>(`/partidas/${partidaId}/resultado`, { method: 'PUT', body: body(data) }),

  listarComissao: (timeId: number) => request<ComissaoTecnica[]>(`/times/${timeId}/comissao`),
  criarComissao: (timeId: number, data: { nome: string; funcao: FuncaoComissao }) =>
    request<ComissaoTecnica>(`/times/${timeId}/comissao`, { method: 'POST', body: body(data) }),
  atualizarComissao: (id: number, data: { nome: string; funcao: FuncaoComissao }) =>
    request<ComissaoTecnica>(`/comissao/${id}`, { method: 'PUT', body: body(data) }),
  excluirComissao: (id: number) => request<void>(`/comissao/${id}`, { method: 'DELETE' }),

  // Súmula granular
  criarGol: (partidaId: number, data: { timeId: number; jogadorId?: number | null; minuto?: number | null; tempoSegundos?: number | null; tipo?: TipoGol }) =>
    request<GolEvento>(`/partidas/${partidaId}/gols`, { method: 'POST', body: body(data) }),
  excluirGol: (id: number) => request<void>(`/gols/${id}`, { method: 'DELETE' }),

  criarCartao: (partidaId: number, data: { timeId: number; jogadorId?: number | null; tipo: TipoCartao; minuto?: number | null; tempoSegundos?: number | null; motivoCodigo?: string | null; motivoDescricao?: string | null }) =>
    request<CartaoEvento>(`/partidas/${partidaId}/cartoes`, { method: 'POST', body: body(data) }),
  excluirCartao: (id: number) => request<void>(`/cartoes/${id}`, { method: 'DELETE' }),

  criarSubstituicao: (partidaId: number, data: { timeId: number; periodo: Periodo; entrouJogadorId: number; saiuJogadorId: number; tempoSegundos?: number | null }) =>
    request<Substituicao>(`/partidas/${partidaId}/substituicoes`, { method: 'POST', body: body(data) }),
  excluirSubstituicao: (id: number) => request<void>(`/substituicoes/${id}`, { method: 'DELETE' }),

  salvarEscalacao: (partidaId: number, data: { titulares: number[]; reservas: number[] }) =>
    request<EscalacaoEntry[]>(`/partidas/${partidaId}/escalacao`, { method: 'PUT', body: body(data) }),

  salvarCronologia: (partidaId: number, data: Partial<Cronologia>) =>
    request<unknown>(`/partidas/${partidaId}/cronologia`, { method: 'PUT', body: body(data) }),

  salvarObservacoes: (partidaId: number, data: Partial<ObservacoesPartida>) =>
    request<unknown>(`/partidas/${partidaId}/observacoes`, { method: 'PUT', body: body(data) }),

  salvarArbitragem: (partidaId: number, data: {
    juizEmail?: string | null; assistente1Email?: string | null; assistente2Email?: string | null;
    quartoArbitroEmail?: string | null; varEmail?: string | null; avarEmail?: string | null;
    avar2Email?: string | null; observadorVarEmail?: string | null;
  }) => request<unknown>(`/partidas/${partidaId}/arbitragem`, { method: 'PUT', body: body(data) }),

  adicionarAuxiliar: (partidaId: number, email: string) =>
    request<{ partidaId: number; usuarioId: number; email: string }>(
      `/partidas/${partidaId}/auxiliares`, { method: 'POST', body: body({ email }) }),
  removerAuxiliar: (partidaId: number, usuarioId: number) =>
    request<void>(`/partidas/${partidaId}/auxiliares/${usuarioId}`, { method: 'DELETE' }),

  salvarStats: (partidaId: number, stats: { timeId: number; chave: ChaveStat; valor: number }[]) =>
    request<StatPartida[]>(`/partidas/${partidaId}/stats`, { method: 'PUT', body: body({ stats }) }),

  fecharPlacar: (partidaId: number, data: {
    golsMandante: number; golsVisitante: number;
    prorrogacao?: boolean;
    golsMandanteProrr?: number | null; golsVisitanteProrr?: number | null;
    penaltisMandante?: number | null; penaltisVisitante?: number | null;
  }) => request<PartidaDetalhe>(`/partidas/${partidaId}/placar`, { method: 'PUT', body: body(data) }),

  salvarDadosPartida: (partidaId: number, data: {
    dataPartida?: string | null;
    local?: string | null;
    transmissao?: string | null;
    camposArbitragemOcultos?: string[];
    camposCustom?: Record<string, CampoCustomValor>;
  }) => request<unknown>(`/partidas/${partidaId}/dados`, { method: 'PUT', body: body(data) }),

  obterSumulaConfig: (campeonatoId: number) =>
    request<SumulaConfig>(`/campeonatos/${campeonatoId}/sumula-config`),
  salvarSumulaConfig: (campeonatoId: number, data: SumulaConfig) =>
    request<SumulaConfig>(`/campeonatos/${campeonatoId}/sumula-config`, { method: 'PUT', body: body(data) }),

  listarArbitrosCampeonato: (campeonatoId: number) =>
    request<ArbitroCampeonato[]>(`/campeonatos/${campeonatoId}/arbitros`),
  convidarArbitro: (campeonatoId: number, data: { email: string; nome?: string | null }) =>
    request<ArbitroCampeonato>(`/campeonatos/${campeonatoId}/arbitros`, { method: 'POST', body: body(data) }),
  removerArbitroCampeonato: (campeonatoId: number, arbitroId: number) =>
    request<void>(`/campeonatos/${campeonatoId}/arbitros/${arbitroId}`, { method: 'DELETE' }),

  publicoListar: () => request<CampeonatoResumoPublico[]>('/public/campeonatos'),
  publicoCampeonato: (id: number) => request<CampeonatoPublico>(`/public/campeonatos/${id}`),
  publicoClassificacao: (id: number) => request<ClassificacaoLinha[]>(`/public/campeonatos/${id}/classificacao`),
  publicoClassificacaoGrupos: (id: number) =>
    request<ClassificacaoGrupo[]>(`/public/campeonatos/${id}/classificacao-grupos`),
  publicoArtilharia: (id: number) => request<Artilheiro[]>(`/public/campeonatos/${id}/artilharia`),
  publicoRodadas: (id: number) => request<Rodada[]>(`/public/campeonatos/${id}/rodadas`),
};
