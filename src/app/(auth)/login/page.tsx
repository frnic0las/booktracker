import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { toSafeCallbackPath } from '@/lib/auth/callback-url';

import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Log In · BookTracker',
};

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps): Promise<React.JSX.Element> {
  const session = await auth();
  const { callbackUrl } = await searchParams;
  const redirectTo = toSafeCallbackPath(callbackUrl);

  if (session?.user) {
    redirect(redirectTo);
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center gap-6 px-7 pb-[env(safe-area-inset-bottom)]">
      <div className="mb-2 flex flex-col items-center gap-3.5 text-center">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[20px] border border-separator bg-gradient-to-br from-surface-2 to-surface-1 text-accent shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4V5.5z" />
            <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6V5.5z" />
          </svg>
        </div>
        <h1 className="text-[28px] font-extrabold tracking-tight text-primary">BookTracker</h1>
        <p className="-mt-3.5 text-[15px] text-secondary">Your personal library</p>
      </div>

      <LoginForm callbackUrl={redirectTo} />
    </div>
  );
}
