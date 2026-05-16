import { Suspense, lazy, useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthSuccessPage } from "./pages/AuthSuccessPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { useAuthStore } from "./store/auth-store";

const CodeReviewPage = lazy(() =>
  import("./pages/CodeReviewPage").then((module) => ({
    default: module.CodeReviewPage,
  })),
);

export function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/success" element={<AuthSuccessPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/review"
            element={
              <Suspense fallback={<LoadingState message="Loading review workspace." />}>
                <CodeReviewPage />
              </Suspense>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function HomeRedirect() {
  const initialized = useAuthStore((state) => state.initialized);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!initialized) {
    return <LoadingState message="Loading your workspace." />;
  }

  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}

function LoadingState({ message }: { message: string }) {
  return (
    <main className="app-shell">
      <section className="status-card">
        <p className="eyebrow">DevMind</p>
        <h1>{message}</h1>
      </section>
    </main>
  );
}
