import { fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  formatAuthError,
  getOAuthErrorFromUrl,
  persistAuthError,
} from '@/auth/authErrors';
import { redirectToLoginWithAuthError } from '@/auth/redirectToLoginWithAuthError';
import { useAuth } from '@/auth/useAuth';

const OAUTH_WAIT_MS = 12_000;

export function AuthCallbackPage() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const urlError = getOAuthErrorFromUrl();
    if (urlError) {
      persistAuthError(urlError);
      redirectToLoginWithAuthError(navigate, urlError, '/protected');
      return;
    }

    const fail = (message: string) => {
      if (!cancelled) {
        redirectToLoginWithAuthError(navigate, message, '/protected');
      }
    };

    const hubUnsubscribe = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signInWithRedirect_failure') {
        const data = payload.data as { message?: string; error?: Error } | undefined;
        fail(
          formatAuthError(
            data?.message ?? data?.error ?? 'Google sign-in failed.',
          ),
        );
      }
    });

    const timeoutId = window.setTimeout(() => {
      fail('Sign-in timed out. Try again or use email and password.');
    }, OAUTH_WAIT_MS);

    (async () => {
      try {
        await refreshUser();
        const session = await fetchAuthSession();

        if (cancelled) {
          return;
        }

        window.clearTimeout(timeoutId);

        if (session.tokens) {
          navigate('/protected', { replace: true });
          return;
        }

        const lateUrlError = getOAuthErrorFromUrl();
        if (lateUrlError) {
          fail(lateUrlError);
          return;
        }

        fail(
          'Could not complete Google sign-in. If you already registered with email, sign in with email and password instead.',
        );
      } catch (err) {
        if (!cancelled) {
          window.clearTimeout(timeoutId);
          fail(formatAuthError(err));
        }
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      hubUnsubscribe();
    };
  }, [refreshUser, navigate]);

  return (
    <section className="page">
      <h1>Signing you in</h1>
      <p className="muted">Completing Google sign-in…</p>
    </section>
  );
}
