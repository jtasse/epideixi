import type { ReactNode } from 'react';

/**
 * Placeholder guard for routes that will require authentication
 * once AWS Cognito (or similar) is wired to the backend.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = false;

  if (!isAuthenticated) {
    return (
      <section className="page">
        <h1>Protected area</h1>
        <p>
          Authentication is not configured yet. This route is reserved for
          signed-in users once backend auth is integrated.
        </p>
        <p className="muted">
          Set <code>isAuthenticated</code> in <code>ProtectedRoute</code> when
          connecting to your AWS-hosted API.
        </p>
      </section>
    );
  }

  return <>{children}</>;
}
