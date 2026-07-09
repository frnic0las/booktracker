'use client';

import { useActionState } from 'react';
import clsx from 'clsx';

import { login } from '@/actions/auth';

const INPUT_BASE_CLASSES =
  'h-[50px] w-full rounded-[10px] bg-surface-1 border border-separator px-4 text-base text-primary outline-none placeholder:text-tertiary focus:bg-surface-2 focus:border-accent focus:ring-3 focus:ring-accent/25';

const INPUT_ERROR_CLASSES = 'border-destructive ring-3 ring-destructive/20';

export interface LoginFormProps {
  callbackUrl: string;
}

export function LoginForm({ callbackUrl }: LoginFormProps): React.JSX.Element {
  const [error, formAction, pending] = useActionState(login, null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <div className="flex flex-col gap-[7px]">
        <label htmlFor="email" className="pl-1 text-[13px] font-semibold text-secondary">
          Email
        </label>
        <input
          id="email"
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className={clsx(INPUT_BASE_CLASSES, error && INPUT_ERROR_CLASSES)}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'login-error' : undefined}
        />
      </div>

      <div className="flex flex-col gap-[7px]">
        <label htmlFor="password" className="pl-1 text-[13px] font-semibold text-secondary">
          Password
        </label>
        <input
          id="password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className={clsx(INPUT_BASE_CLASSES, error && INPUT_ERROR_CLASSES)}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'login-error' : undefined}
        />
      </div>

      {error ? (
        <div id="login-error" role="alert" className="flex items-center gap-2 px-1 text-[13px] font-semibold text-destructive">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v6M12 16.5v.5" />
          </svg>
          <span>{error}</span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-1.5 h-[50px] w-full rounded-[10px] bg-accent text-[17px] font-semibold text-white active:bg-accent-pressed disabled:opacity-60"
      >
        {pending ? 'Logging in…' : 'Log In'}
      </button>
    </form>
  );
}
