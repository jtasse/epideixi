import {
  confirmSignUp,
  fetchAuthSession,
  getCurrentUser,
  signIn,
  signInWithRedirect,
  signOut,
  signUp,
} from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type AuthContextValue = {
  user: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    name: string,
  ) => Promise<void>;
  confirmRegistration: (email: string, code: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export type AppUser = {
  userId: string;
  email: string | null;
  name: string | null;
};

async function resolveAppUser(): Promise<AppUser | null> {
  try {
    const [currentUser, session] = await Promise.all([
      getCurrentUser(),
      fetchAuthSession(),
    ]);

    const claims = session.tokens?.idToken?.payload;
    const email =
      typeof claims?.email === 'string'
        ? claims.email
        : currentUser.signInDetails?.loginId ?? null;
    const name = typeof claims?.name === 'string' ? claims.name : null;

    return {
      userId: currentUser.userId,
      email,
      name,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    setUser(await resolveAppUser());
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await refreshUser();
      if (!cancelled) {
        setIsLoading(false);
      }
    })();

    const unsubscribe = Hub.listen('auth', () => {
      void refreshUser();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [refreshUser]);

  const signInWithGoogle = useCallback(async () => {
    await signInWithRedirect({ provider: 'Google' });
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      await signIn({ username: email, password });
      await refreshUser();
    },
    [refreshUser],
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, name: string) => {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            name,
          },
        },
      });
    },
    [],
  );

  const confirmRegistration = useCallback(
    async (email: string, code: string) => {
      await confirmSignUp({ username: email, confirmationCode: code });
      await refreshUser();
    },
    [refreshUser],
  );

  const signOutUser = useCallback(async () => {
    await signOut({ global: true });
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      confirmRegistration,
      signOutUser,
      refreshUser,
    }),
    [
      user,
      isLoading,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      confirmRegistration,
      signOutUser,
      refreshUser,
    ],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
