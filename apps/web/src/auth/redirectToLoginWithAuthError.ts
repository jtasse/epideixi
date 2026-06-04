import type { NavigateFunction } from 'react-router-dom';
import { persistAuthError } from '@/auth/authErrors';

export function redirectToLoginWithAuthError(
  navigate: NavigateFunction,
  message: string,
  from = '/protected',
): void {
  persistAuthError(message);
  navigate('/login', {
    replace: true,
    state: { authError: message, from },
  });
}
