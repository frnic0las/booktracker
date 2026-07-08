import { auth, signOut } from '@/lib/auth';

import { AccountStats } from './AccountStats';

export default async function AccountPage(): Promise<React.JSX.Element> {
  const session = await auth();
  const email = session?.user?.email;

  async function logout(): Promise<void> {
    'use server';
    await signOut({ redirectTo: '/login' });
  }

  return (
    <div className="flex flex-col gap-6 px-5 pb-6 pt-1">
      <div>
        <h1 className="text-[32px] font-extrabold tracking-tight text-primary">Account</h1>
        {email ? <p className="mt-1 text-[15px] text-secondary">{email}</p> : null}
      </div>

      <AccountStats />

      <form action={logout}>
        <button
          type="submit"
          className="h-[48px] w-full rounded-2xl bg-surface-1 text-[15px] font-semibold text-destructive"
        >
          Log Out
        </button>
      </form>
    </div>
  );
}
