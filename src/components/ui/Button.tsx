import * as React from 'react';
import { cn } from '../../lib/utils';

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'; size?: 'default' | 'sm' | 'lg' | 'icon' }>(
  ({ className, variant = 'primary', size = 'default', ...props }, ref) => {
    const variants = {
      primary: 'bg-white text-black hover:bg-white/90 shadow-[0_0_15px_rgba(255,255,255,0.2)]',
      secondary: 'bg-white/10 text-white hover:bg-white/20 border border-white/5',
      ghost: 'hover:bg-white/10 text-white/80 hover:text-white',
      danger: 'bg-red-500/20 text-red-200 border border-red-500/50 hover:bg-red-500/30',
      outline: 'border border-white/20 bg-transparent hover:bg-white/5 text-white',
    };
    const sizes = {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 rounded-md px-3',
      lg: 'h-11 rounded-md px-8',
      icon: 'h-10 w-10',
    };
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
