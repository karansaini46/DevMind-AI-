import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { WorkspaceLayout } from "./components/WorkspaceLayout";
import { AuthSuccessPage } from "./pages/AuthSuccessPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SettingsPage } from "./pages/SettingsPage";
import { useAuthStore } from "./store/auth-store";

const CodeReviewPage = lazy(() =>
  import("./pages/CodeReviewPage").then((module) => ({
    default: module.CodeReviewPage,
  })),
);

const GitHubPage = lazy(() =>
  import("./pages/GitHubPage").then((module) => ({
    default: module.GitHubPage,
  })),
);

const ReviewResultPage = lazy(() =>
  import("./pages/ReviewResultPage").then((module) => ({
    default: module.ReviewResultPage,
  })),
);

const SearchPage = lazy(() =>
  import("./pages/SearchPage").then((module) => ({
    default: module.SearchPage,
  })),
);

const SnippetDetailPage = lazy(() =>
  import("./pages/SnippetDetailPage").then((module) => ({
    default: module.SnippetDetailPage,
  })),
);

const SnippetsPage = lazy(() =>
  import("./pages/SnippetsPage").then((module) => ({
    default: module.SnippetsPage,
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
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/success" element={<AuthSuccessPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route element={<WorkspaceLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route
              path="/review"
              element={
                <Suspense fallback={<LoadingState message="Loading review cockpit." />}>
                  <CodeReviewPage />
                </Suspense>
              }
            />
            <Route
              path="/reviews/:reviewId"
              element={
                <Suspense fallback={<LoadingState message="Loading review report." />}>
                  <ReviewResultPage />
                </Suspense>
              }
            />
            <Route
              path="/github"
              element={
                <Suspense fallback={<LoadingState message="Loading GitHub setup." />}>
                  <GitHubPage />
                </Suspense>
              }
            />
            <Route
              path="/search"
              element={
                <Suspense fallback={<LoadingState message="Loading search." />}>
                  <SearchPage />
                </Suspense>
              }
            />
            <Route
              path="/snippets"
              element={
                <Suspense fallback={<LoadingState message="Loading snippets." />}>
                  <SnippetsPage />
                </Suspense>
              }
            />
            <Route
              path="/snippets/:snippetId"
              element={
                <Suspense fallback={<LoadingState message="Loading snippet." />}>
                  <SnippetDetailPage />
                </Suspense>
              }
            />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
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
