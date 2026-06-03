import { useEffect, useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useAuth } from '@/auth/useAuth';
import { env } from '@/config/env';

export function ProtectedPage() {
  const { user } = useAuth();
  const [apiMessage, setApiMessage] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.accessToken?.toString();
        if (!token) {
          setApiError('No access token available.');
          return;
        }

        const response = await fetch(`${env.apiBaseUrl}/api/sample`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          setApiError(`API returned ${response.status}`);
          return;
        }

        const body = (await response.json()) as {
          data?: { subject?: string; email?: string };
        };
        if (!cancelled) {
          setApiMessage(
            `API sample OK — subject: ${body.data?.subject ?? 'n/a'}, email: ${body.data?.email ?? 'n/a'}`,
          );
        }
      } catch (err) {
        if (!cancelled) {
          setApiError(err instanceof Error ? err.message : 'API call failed.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="page">
      <h1>Protected</h1>
      <p>Only signed-in users can view this page. Your session persists across refreshes.</p>
      <dl className="meta-list">
        <div>
          <dt>User ID</dt>
          <dd>
            <code>{user?.userId}</code>
          </dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{user?.email ?? '—'}</dd>
        </div>
        <div>
          <dt>Name</dt>
          <dd>{user?.name ?? '—'}</dd>
        </div>
      </dl>
      {apiMessage && <p className="message success">{apiMessage}</p>}
      {apiError && <p className="message error">{apiError}</p>}
    </section>
  );
}
