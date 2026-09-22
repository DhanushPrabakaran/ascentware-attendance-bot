import { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border border-transparent shadow-sm text-secondary bg-primary hover:bg-primaryHover',
  secondary:
    'border border-borderBase text-secondary/80 bg-surface hover:bg-white/5 hover:text-secondary',
  danger: 'border border-transparent shadow-sm text-white bg-red-500 hover:bg-red-600',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2 ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
