import { CircleDot } from 'lucide-react';

interface TeamShieldProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function TeamShield({ size = 'md' }: TeamShieldProps) {
  const sizes: Record<string, { container: string; icon: string }> = {
    xs: { container: 'w-6 h-6', icon: 'w-3 h-3' },
    sm: { container: 'w-9 h-9', icon: 'w-4 h-4' },
    md: { container: 'w-12 h-12', icon: 'w-6 h-6' },
    lg: { container: 'w-16 h-16', icon: 'w-8 h-8' },
  };
  const { container, icon } = sizes[size];

  return (
    <div className={`${container} rounded-full bg-gray-200 flex items-center justify-center shrink-0`}>
      <CircleDot className={`${icon} text-gray-400`} />
    </div>
  );
}
