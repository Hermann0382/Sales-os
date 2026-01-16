'use client';

import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { cn } from '@/lib/utils';

export interface NavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

interface SidebarProps {
  groups: NavGroup[];
  logo?: React.ReactNode;
  logoHref?: string;
  roleLabel?: string;
  roleLabelVariant?: 'default' | 'manager' | 'admin';
  className?: string;
}

const roleLabelColors = {
  default: 'bg-primary/10 text-primary',
  manager: 'bg-secondary/10 text-secondary',
  admin: 'bg-destructive/10 text-destructive',
};

export function Sidebar({
  groups,
  logo,
  logoHref = '/agent/dashboard',
  roleLabel,
  roleLabelVariant = 'default',
  className,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'w-64 bg-white border-r border-border flex flex-col',
        className
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border">
        <Link href={logoHref} className="text-xl font-bold text-primary">
          {logo || 'CallOS'}
        </Link>
        {roleLabel && (
          <span
            className={cn(
              'ml-2 text-xs px-2 py-0.5 rounded',
              roleLabelColors[roleLabelVariant]
            )}
          >
            {roleLabel}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {groups.map((group, groupIndex) => (
          <div key={groupIndex}>
            {group.label && (
              <div className="pt-4 pb-2">
                <span className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </span>
              </div>
            )}
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {item.icon && (
                    <span className="w-5 h-5 flex items-center justify-center">
                      {item.icon}
                    </span>
                  )}
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        isActive
                          ? 'bg-primary text-white'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <UserButton afterSignOutUrl="/" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              Account
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
