import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { API_URL } from "../lib/api";
import { useAuthStore } from "../store/auth-store";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const registerAccount = useAuthStore((state) => state.register);
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(values: RegisterValues) {
    try {
      await registerAccount(values);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setError("root", {
        message: error instanceof Error ? error.message : "Unable to create account",
      });
    }
  }

  return (
    <main className="app-shell">
      <section className="auth-card">
        <p className="eyebrow">DevMind</p>
        <h1>Create account</h1>
        <p className="hero-copy">Start with email, GitHub, or both.</p>

        <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
          <label>
            Name
            <input autoComplete="name" {...register("name")} />
          </label>
          {errors.name ? <p className="form-error">{errors.name.message}</p> : null}

          <label>
            Email
            <input type="email" autoComplete="email" {...register("email")} />
          </label>
          {errors.email ? <p className="form-error">{errors.email.message}</p> : null}

          <label>
            Password
            <input
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
          </label>
          {errors.password ? (
            <p className="form-error">{errors.password.message}</p>
          ) : null}

          {errors.root ? <p className="form-error">{errors.root.message}</p> : null}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create account"}
          </button>
        </form>

        <a className="github-button" href={`${API_URL}/auth/github`}>
          Continue with GitHub
        </a>

        <p className="auth-switch">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
