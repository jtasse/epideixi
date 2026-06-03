import { fetchAuthSession } from 'aws-amplify/auth';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';

export function AuthCallbackPage() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await refreshUser();
        const session = await fetchAuthSession();
        const destination = session.tokens ? '/protected' : '/login';
        if (!cancelled) {
          navigate(destination, { replace: true });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Could not complete sign-in.',
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshUser, navigate]);

  return (
    <section className="page">
      <h1>Signing you in</h1>
      {error ? (
        <p className="message error">{error}</p>
      ) : (
        <p className="muted">Completing Google sign-in…</p>
      )}
    </section>
  );
}
