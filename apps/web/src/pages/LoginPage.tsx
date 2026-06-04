import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  consumeAuthError,
  formatAuthError,
  getOAuthErrorFromUrl,
} from '@/auth/authErrors';
import { useAuth } from '@/auth/useAuth';

type Mode = 'signIn' | 'signUp' | 'confirm';

export function LoginPage() {
  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    confirmRegistration,
    isAuthenticated,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? '/protected';

  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const state = location.state as { authError?: string; from?: string } | null;
    const urlError = getOAuthErrorFromUrl();
    const message = urlError ?? state?.authError ?? consumeAuthError();
    if (!message) {
      return;
    }

    setError(message);

    if (urlError || state?.authError) {
      navigate('/login', {
        replace: true,
        state: state?.from ? { from: state.from } : {},
      });
    }
  }, [location.state, navigate]);

  if (isAuthenticated) {
    navigate(redirectTo, { replace: true });
    return null;
  }

  async function handleGoogle() {
    setError(null);
    setPending(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(formatAuthError(err));
      setPending(false);
    }
  }

  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      if (mode === 'signIn') {
        await signInWithEmail(email, password);
        navigate(redirectTo, { replace: true });
      } else if (mode === 'signUp') {
        await signUpWithEmail(email, password, name);
        setMessage('Check your email for a verification code, then confirm below.');
        setMode('confirm');
      } else {
        await confirmRegistration(email, code);
        setMessage('Account confirmed. You can sign in now.');
        setMode('signIn');
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="page">
      <h1>Sign in</h1>
      <p className="muted">
        Use Google or register with email and password via Amazon Cognito.
      </p>

      <button
        type="button"
        className="btn btn-google"
        onClick={() => void handleGoogle()}
        disabled={pending}
      >
        Continue with Google
      </button>

      <p className="divider">or use email</p>

      <form className="auth-form" onSubmit={(e) => void handleEmailSubmit(e)}>
        {mode === 'signUp' && (
          <label>
            Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </label>
        )}
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        {mode !== 'confirm' && (
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={
                mode === 'signUp' ? 'new-password' : 'current-password'
              }
            />
          </label>
        )}
        {mode === 'confirm' && (
          <label>
            Verification code
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoComplete="one-time-code"
            />
          </label>
        )}
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {mode === 'signIn' && 'Sign in'}
          {mode === 'signUp' && 'Create account'}
          {mode === 'confirm' && 'Confirm email'}
        </button>
      </form>

      <p className="auth-switch">
        {mode === 'signIn' && (
          <>
            No account?{' '}
            <button type="button" className="link-button" onClick={() => setMode('signUp')}>
              Register
            </button>
          </>
        )}
        {mode === 'signUp' && (
          <>
            Already registered?{' '}
            <button type="button" className="link-button" onClick={() => setMode('signIn')}>
              Sign in
            </button>
          </>
        )}
        {mode === 'confirm' && (
          <button type="button" className="link-button" onClick={() => setMode('signIn')}>
            Back to sign in
          </button>
        )}
      </p>

      {message && <p className="message success">{message}</p>}
      {error && <p className="message error">{error}</p>}

      <p>
        <Link to="/">Back to home</Link>
      </p>
    </section>
  );
}
