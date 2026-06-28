import { useEffect } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { hasSupabaseConfig } from "@/lib/supabase";
import { Toaster } from "sonner";
import { Layout } from "@/components/Layout";
import { useThemeStore } from "@/stores";
import { useAuthStore, useAppStore } from "@/stores";
import HomePage from "@/pages/Home";
import ExplorePage from "@/pages/Explore";
import UploadPage from "@/pages/Upload";
import ProfilePage from "@/pages/Profile";
import VideoPage from "@/pages/VideoPage";
import MessagesPage from "@/pages/Messages";
import AuthPage from "@/pages/Auth";
import SettingsPage from "@/pages/Settings";
import ConnectionsPage from "@/pages/ConnectionsPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const initTheme = useThemeStore((s) => s.initTheme);
  const hydrateSession = useAuthStore((s) => s.hydrateSession);
  const loadAppData = useAppStore((s) => s.loadAppData);

  useEffect(() => {
    initTheme();
    const initialize = async () => {
      await hydrateSession();
      await loadAppData();
    };
    void initialize();
  }, [initTheme, hydrateSession, loadAppData]);

  return (
    <HashRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--surface-color)",
            color: "var(--on-surface-color)",
            border: "1px solid var(--border-custom-color)",
            borderRadius: "12px",
            fontFamily: "'Comic Sans MS', cursive, system-ui",
          },
        }}
        richColors
      />
      {!hasSupabaseConfig && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 shadow-lg backdrop-blur">
          Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para ativar autenticação e mensagens reais.
        </div>
      )}
      <Routes>
        {/* Auth routes (no layout) */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <AuthPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <AuthPage />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <AuthPage />
            </PublicRoute>
          }
        />

        {/* App routes (with layout) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <HomePage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/explore"
          element={
            <ProtectedRoute>
              <Layout>
                <ExplorePage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <Layout>
                <UploadPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <ProfilePage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:username"
          element={
            <ProtectedRoute>
              <Layout>
                <ProfilePage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/connections"
          element={
            <ProtectedRoute>
              <Layout>
                <ConnectionsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:username/connections"
          element={
            <ProtectedRoute>
              <Layout>
                <ConnectionsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/video/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <VideoPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <Layout>
                <MessagesPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout>
                <SettingsPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route
          path="*"
          element={
            <Layout>
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center animate-fade-in">
                  <h1 className="text-2xl font-bold text-on-surface mb-2">Página não encontrada</h1>
                  <p className="text-on-surface-muted mb-4">A página que você buscou não existe.</p>
                  <a
                    href="#/"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark transition-colors"
                  >
                    Voltar ao Início
                  </a>
                </div>
              </div>
            </Layout>
          }
        />
      </Routes>
    </HashRouter>
  );
}
