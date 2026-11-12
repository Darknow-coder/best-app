import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface BaseProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: boolean;
  children?: ReactNode;
  className?: string;
}

type ButtonProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined };
type LinkProps = BaseProps & { to: string; state?: unknown; replace?: boolean; 'aria-label'?: string };

function cls({ variant = 'primary', size = 'md', block, icon, className }: BaseProps) {
  return [
    'btn',
    `btn-${variant}`,
    size === 'lg' ? 'btn-lg' : size === 'sm' ? 'btn-sm' : '',
    block ? 'btn-block' : '',
    icon ? 'btn-icon' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function Button(props: ButtonProps | LinkProps) {
  if ('to' in props && props.to !== undefined) {
    const { to, state, replace, children, variant, size, block, icon, className, ...rest } = props;
    return (
      <Link to={to} state={state} replace={replace} className={cls({ variant, size, block, icon, className })} {...rest}>
        {children}
      </Link>
    );
  }
  const { children, variant, size, block, icon, className, type = 'button', ...rest } = props as ButtonProps;
  return (
    <button type={type} className={cls({ variant, size, block, icon, className })} {...rest}>
      {children}
    </button>
  );
}
