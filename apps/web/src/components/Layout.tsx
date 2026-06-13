import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { ThemePicker } from '@/components/ThemePicker';

export function Layout() {
  const { user, isAuthenticated, isLoading, signOutUser } = useAuth();

  return (
    <div className="app">
      <header className="app-header">
        <p className="app-brand">Epideixi</p>
        <nav className="app-nav" aria-label="Main">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/protected">My Notes</NavLink>
          {!isLoading && !isAuthenticated && (
            <NavLink to="/login">Sign in</NavLink>
          )}
        </nav>
        <div className="app-user">
          <ThemePicker />
          {isLoading && <span className="muted">…</span>}
          {!isLoading && isAuthenticated && user && (
            <>
              <span className="user-label" title={user.userId}>
                {user.email ?? user.name ?? 'Signed in'}
              </span>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => void signOutUser()}
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
