import { DUPLICATE_EMAIL_MESSAGE } from './duplicateEmailMessage';

const PRESIGNUP_PREFIX = /PreSignUp failed with error\s*/gi;
const AUTH_ERROR_STORAGE_KEY = 'epideixi-auth-error';

export function formatAuthError(error: unknown): string {
  if (error instanceof Error) {
    return normalizeAuthMessage(error.message, error.name);
  }

  if (error && typeof error === 'object') {
    const record = error as { name?: string; message?: string };
    if (typeof record.message === 'string') {
      return normalizeAuthMessage(record.message, record.name);
    }
  }

  return 'Authentication failed. Try again.';
}

export function getOAuthErrorFromSearch(search: string): string | null {
  const params = new URLSearchParams(
    search.startsWith('?') || search.startsWith('#') ? search.slice(1) : search,
  );
  const description = params.get('error_description');
  if (description) {
    return normalizeAuthMessage(
      decodeURIComponent(description.replace(/\+/g, ' ')),
    );
  }

  const error = params.get('error');
  if (error && error !== 'access_denied') {
    return 'Sign-in was cancelled or could not be completed.';
  }

  return null;
}

export function getOAuthErrorFromUrl(): string | null {
  const fromSearch = getOAuthErrorFromSearch(window.location.search);
  if (fromSearch) {
    return fromSearch;
  }

  const hash = window.location.hash;
  if (!hash || hash.length <= 1) {
    return null;
  }

  return getOAuthErrorFromSearch(hash.startsWith('#') ? hash.slice(1) : hash);
}

export function persistAuthError(message: string): void {
  try {
    sessionStorage.setItem(AUTH_ERROR_STORAGE_KEY, message);
  } catch {
    /* private browsing */
  }
}

export function consumeAuthError(): string | null {
  try {
    const message = sessionStorage.getItem(AUTH_ERROR_STORAGE_KEY);
    if (message) {
      sessionStorage.removeItem(AUTH_ERROR_STORAGE_KEY);
      return message;
    }
  } catch {
    /* private browsing */
  }
  return null;
}

function normalizeAuthMessage(message: string, name?: string): string {
  const trimmed = message.replace(PRESIGNUP_PREFIX, '').trim();

  if (isDuplicateEmailError(trimmed, name)) {
    return DUPLICATE_EMAIL_MESSAGE;
  }

  return trimmed || 'Authentication failed. Try again.';
}

function isDuplicateEmailError(message: string, name?: string): boolean {
  return (
    name === 'UsernameExistsException' ||
    name === 'UserLambdaValidationException' ||
    message.toLowerCase().includes('already exists')
  );
}
