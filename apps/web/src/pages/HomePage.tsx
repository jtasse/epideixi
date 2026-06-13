import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { env } from '@/config/env';

export function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  return (
    <section className="page">
      <h1>Home</h1>
      <p>
        React frontend with Amazon Cognito authentication. Sign in with Google
        or register with email, then access protected routes and the API.
      </p>

      {isLoading && <p className="muted">Loading session…</p>}

      {isAuthenticated && user && (
        <dl className="meta-list">
          <div>
            <dt>Signed in as</dt>
            <dd>{user.email ?? user.userId}</dd>
          </div>
          {user.name && (
            <div>
              <dt>Name</dt>
              <dd>{user.name}</dd>
            </div>
          )}
        </dl>
      )}

      {!isAuthenticated && !isLoading && (
        <p>
          <Link to="/login">Sign in or register</Link>
        </p>
      )}

      <dl className="meta-list">
        <div>
          <dt>API base URL</dt>
          <dd>
            <code>{env.apiBaseUrl}</code>
          </dd>
        </div>
      </dl>

      <p>
        <Link to="/protected">My Notes</Link>
      </p>
    </section>
  );
}
