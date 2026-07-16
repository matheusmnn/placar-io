interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const styles: Record<string, { text: string; svg: number }> = {
    sm: { text: 'text-xl', svg: 15 },
    md: { text: 'text-2xl', svg: 19 },
    lg: { text: 'text-4xl', svg: 30 },
  };
  const { text, svg } = styles[size];

  return (
    <span className={`font-bold flex items-center select-none ${text} ${className}`}>
      <span style={{ color: '#16a34a' }}>Placar</span>
      <svg
        width={svg}
        height={svg}
        viewBox="0 0 24 24"
        className="mx-0.5 shrink-0"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="11" fill="#16a34a" />
        {/* Pentagon patch */}
        <polygon
          points="12,5.5 15.4,8.8 14.1,12.8 9.9,12.8 8.6,8.8"
          fill="none"
          stroke="white"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        {/* Seam lines from vertices to edge */}
        <line x1="12" y1="5.5" x2="12" y2="2.2" stroke="white" strokeWidth="1" strokeLinecap="round" />
        <line x1="15.4" y1="8.8" x2="19" y2="7.8" stroke="white" strokeWidth="1" strokeLinecap="round" />
        <line x1="14.1" y1="12.8" x2="16.8" y2="16.2" stroke="white" strokeWidth="1" strokeLinecap="round" />
        <line x1="9.9" y1="12.8" x2="7.2" y2="16.2" stroke="white" strokeWidth="1" strokeLinecap="round" />
        <line x1="8.6" y1="8.8" x2="5" y2="7.8" stroke="white" strokeWidth="1" strokeLinecap="round" />
      </svg>
      <span className="text-gray-900">io</span>
    </span>
  );
}
