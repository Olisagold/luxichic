'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps, ReactNode } from 'react';

type NavLinkProps = Omit<ComponentProps<typeof Link>, 'href' | 'className' | 'children'> & {
  href: string;
  /** Only match the exact path, not its children. */
  end?: boolean;
  className?: string | ((state: { isActive: boolean }) => string);
  children?: ReactNode | ((state: { isActive: boolean }) => ReactNode);
};

/** A <Link> that knows whether it points at the current route. */
export function NavLink({ href, end, className, children, ...rest }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = end || href === '/' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={typeof className === 'function' ? className({ isActive }) : className}
      {...rest}>
      {typeof children === 'function' ? children({ isActive }) : children}
    </Link>);

}
