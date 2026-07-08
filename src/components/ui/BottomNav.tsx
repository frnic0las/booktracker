'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavTab {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const TABS: NavTab[] = [
  {
    href: '/novels',
    label: 'Novels',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4V5.5z" />
        <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6V5.5z" />
      </svg>
    ),
  },
  {
    href: '/non-fiction',
    label: 'Non-Fiction',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M6 4h9l3 3v13H6z" />
        <path d="M9 9h6M9 13h6M9 17h4" />
      </svg>
    ),
  },
  {
    href: '/account',
    label: 'Account',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </svg>
    ),
  },
];

export function BottomNav(): React.JSX.Element {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 grid grid-cols-3 bg-surface-1/90 backdrop-blur-xl border-t border-separator pb-[env(safe-area-inset-bottom)]">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            aria-label={tab.label}
            className={`flex min-h-[56px] flex-col items-center justify-center gap-[3px] text-[10px] font-semibold ${
              isActive ? 'text-accent' : 'text-tertiary'
            }`}
          >
            {tab.icon}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
