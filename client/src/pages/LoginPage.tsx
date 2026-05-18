import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { API_URL } from "../lib/api";
import { hasCompletedOnboarding } from "../lib/onboarding";
import { useAuthStore } from "../store/auth-store";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const oauthError = searchParams.get("oauthError");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  async function onSubmit(values: LoginValues) {
    try {
      await login(values);
      navigate(from ?? (hasCompletedOnboarding() ? "/dashboard" : "/onboarding"), { replace: true });
    } catch (caughtError) {
      setError("root", {
        message: caughtError instanceof Error ? caughtError.message : "Unable to sign in",
      });
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">DevMind</p>
        <h1>Sign in</h1>
        <p className="hero-copy">Return to the cockpit.</p>

        <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
          <label>
            Email
            <input type="email" autoComplete="email" {...register("email")} />
          </label>
          {errors.email ? <p className="form-error">{errors.email.message}</p> : null}

          <label>
            Password
            <input type="password" autoComplete="current-password" {...register("password")} />
          </label>
          {errors.password ? <p className="form-error">{errors.password.message}</p> : null}

          {errors.root ? <p className="form-error">{errors.root.message}</p> : null}
          {oauthError ? <p className="form-error">{oauthError}</p> : null}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <a className="github-button" href={`${API_URL}/auth/github`}>
          Continue with GitHub
        </a>

        <p className="auth-switch">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
