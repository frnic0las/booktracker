'use server';

import { AuthError } from 'next-auth';

import { signIn } from '@/lib/auth';
import { toSafeCallbackPath } from '@/lib/auth/callback-url';

export async function login(_prevState: string | null, formData: FormData): Promise<string | null> {
  const email = formData.get('email');
  const password = formData.get('password');

  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: toSafeCallbackPath(formData.get('callbackUrl')),
    });

    return null;
  } catch (error) {
    if (error instanceof AuthError) {
      return 'Invalid email or password.';
    }

    // Next.js redirect() throws NEXT_REDIRECT internally — it must propagate.
    throw error;
  }
}
