import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router";
import { authClient } from "../lib/auth-client";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFields = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFields>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: LoginFields) => {
    const { error } = await authClient.signIn.email(data);
    if (error) {
      setError("root", { message: "Invalid email or password." });
      return;
    }
    navigate("/");
  };

  return (
    <div className="login-dot-grid min-h-screen bg-background flex items-center justify-center">
      <div className="relative w-full max-w-sm px-4">
        {/* Ambient glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="relative bg-card border border-border rounded-2xl p-8 shadow-xl">
          {/* Top edge glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-px h-px w-32 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          <div className="flex items-center gap-2.5 mb-8">
            <span className="text-primary text-xl leading-none select-none">◆</span>
            <span className="text-foreground font-semibold tracking-[0.1em] text-sm uppercase">
              HelpDesk
            </span>
          </div>

          <h1 className="text-foreground text-2xl font-semibold mb-1">Welcome back</h1>
          <p className="text-sm text-muted-foreground mb-7">Sign in to continue</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register("email")}
                placeholder=""
                className={`w-full bg-input border rounded-lg px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-all ${
                  errors.email
                    ? "border-red-500/40 focus:ring-red-500/20"
                    : "border-border focus:ring-primary/25 focus:border-primary/40"
                }`}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password")}
                placeholder=""
                className={`w-full bg-input border rounded-lg px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-all ${
                  errors.password
                    ? "border-red-500/40 focus:ring-red-500/20"
                    : "border-border focus:ring-primary/25 focus:border-primary/40"
                }`}
              />
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{errors.password.message}</p>
              )}
            </div>

            {errors.root && (
              <p className="text-xs text-red-500 dark:text-red-400 bg-red-500/8 border border-red-500/20 rounded-lg px-3.5 py-2.5">
                {errors.root.message}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground text-sm font-semibold py-2.5 rounded-lg transition-colors"
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
