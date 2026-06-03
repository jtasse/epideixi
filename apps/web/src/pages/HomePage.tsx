import { Link } from 'react-router-dom';
import { env } from '@/config/env';

export function HomePage() {
  return (
    <section className="page">
      <h1>Home</h1>
      <p>
        React frontend in the Epideixi monorepo. Use this app to learn how a
        modern SPA connects to AWS-hosted backend services.
      </p>
      <dl className="meta-list">
        <div>
          <dt>API base URL</dt>
          <dd>
            <code>{env.apiBaseUrl}</code>
          </dd>
        </div>
      </dl>
      <p>
        <Link to="/protected">Go to protected placeholder</Link>
      </p>
    </section>
  );
}
