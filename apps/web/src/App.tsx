import { Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { ErrorPage } from '@/pages/ErrorPage';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { ProtectedPage } from '@/pages/ProtectedPage';

export default function App() {
  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route
          path="protected"
          element={
            <ProtectedRoute>
              <ProtectedPage />
            </ProtectedRoute>
          }
        />
        <Route path="error" element={<ErrorPage />} />
        <Route path="*" element={<ErrorPage status={404} />} />
      </Route>
    </Routes>
  );
}
