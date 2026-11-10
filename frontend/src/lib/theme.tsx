import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'dark' | 'light';
const STORAGE_KEY = 'placario.theme';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  set: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStored(): Theme {
  // shortcut: tema travado em claro, desenho é cream-only; voltar a honrar o storage
  // quando o desenho escuro completo existir.
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignora */ }
  return 'light';
}

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const t = readStored();
    apply(t);
    return t;
  });

  useEffect(() => {
    apply(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignora */
    }
  }, [theme]);

  const value: ThemeContextValue = {
    theme,
    toggle: () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')),
    set: setThemeState,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme deve ser usado dentro do ThemeProvider');
  return ctx;
}
