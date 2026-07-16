
const KEY = 'placar.campeonatoAtivo';
const KEY_TIME = 'placar.timeAtivo';
const KEY_PARTIDA = 'placar.partidaAtiva';

export interface CampeonatoAtivo { id: number; nome: string; }
export interface TimeAtivo { id: number; nome: string; }

export const campeonatoAtivo = {
  get: (): CampeonatoAtivo | null => {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CampeonatoAtivo) : null;
  },
  set: (c: CampeonatoAtivo) => localStorage.setItem(KEY, JSON.stringify(c)),
  clear: () => {
    localStorage.removeItem(KEY);
    localStorage.removeItem(KEY_TIME);
    localStorage.removeItem(KEY_PARTIDA);
  },
};

export const timeAtivo = {
  get: (): TimeAtivo | null => {
    const raw = localStorage.getItem(KEY_TIME);
    return raw ? (JSON.parse(raw) as TimeAtivo) : null;
  },
  set: (t: TimeAtivo) => localStorage.setItem(KEY_TIME, JSON.stringify(t)),
  clear: () => localStorage.removeItem(KEY_TIME),
};

export const partidaAtiva = {
  get: (): number | null => {
    const raw = localStorage.getItem(KEY_PARTIDA);
    return raw ? Number(raw) : null;
  },
  set: (id: number) => localStorage.setItem(KEY_PARTIDA, String(id)),
  clear: () => localStorage.removeItem(KEY_PARTIDA),
};
