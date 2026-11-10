import { useNavigate } from 'react-router';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'light';
  className?: string;
}

const sizes = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-2xl',
};

export function Logo({ size = 'md', tone = 'default', className = '' }: LogoProps) {
  const navigate = useNavigate();
  const text = sizes[size];
  const color = tone === 'light' ? 'text-background' : 'text-foreground';
  return (
    <button
      type="button"
      onClick={() => navigate('/')}
      aria-label="Ir para a tela inicial"
      className={`inline-flex items-baseline gap-0 select-none font-display font-semibold tracking-tight cursor-pointer hover:opacity-80 transition-opacity ${text} ${color} ${className}`}
    >
      placar<span className="text-brand">/</span>io
    </button>
  );
}
