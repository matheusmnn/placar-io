interface TeamShieldProps {
  nome?: string | null;
  cor?: string | null;
  abreviacao?: string | null;
  escudoUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  xs: 'h-6 w-6 text-[9px]',
  sm: 'h-8 w-8 text-[10px]',
  md: 'h-10 w-10 text-[11px]',
  lg: 'h-14 w-14 text-sm',
  xl: 'h-20 w-20 text-lg',
};

// Paleta fallback quando o time não tem cor configurada. Hash determinístico pelo nome.
const PALETA = [
  '#e14b3a', '#2a7a4c', '#2e5aa8', '#f2b544',
  '#8c3fb5', '#148a95', '#c84a2c', '#3a7d2a',
  '#7d4ae3', '#0f8a7a', '#b73757', '#d98927',
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function corDoTime(nome: string | null | undefined, corExplicita?: string | null): string {
  if (corExplicita) return corExplicita;
  const n = (nome ?? '').trim();
  if (!n) return '#78726a';
  return PALETA[hash(n.toLowerCase()) % PALETA.length];
}

export function abreviacaoDoTime(nome: string | null | undefined, abrevExplicita?: string | null): string {
  if (abrevExplicita) return abrevExplicita.toUpperCase();
  const n = (nome ?? '').trim();
  if (!n) return '?';
  const palavras = n.split(/\s+/).filter(Boolean);
  if (palavras.length >= 3) {
    return (palavras[0][0] + palavras[1][0] + palavras[2][0]).toUpperCase();
  }
  if (palavras.length === 2) {
    return (palavras[0][0] + palavras[1][0] + (palavras[1][1] ?? '')).toUpperCase();
  }
  return palavras[0].slice(0, 3).toUpperCase();
}

export function TeamShield({ nome, cor, abreviacao, escudoUrl, size = 'md', className = '' }: TeamShieldProps) {
  const sizeCls = sizes[size];
  if (escudoUrl) {
    return (
      <img
        src={escudoUrl}
        alt={nome ?? 'escudo'}
        className={`${sizeCls} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }
  const bg = corDoTime(nome, cor);
  const abbr = abreviacaoDoTime(nome, abreviacao);
  return (
    <span
      aria-label={nome ?? undefined}
      className={`${sizeCls} rounded-full inline-flex items-center justify-center shrink-0 font-semibold text-white ${className}`}
      style={{ backgroundColor: bg }}
    >
      {abbr}
    </span>
  );
}
