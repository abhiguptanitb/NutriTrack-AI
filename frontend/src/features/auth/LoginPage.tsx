import { FormEvent, useState } from "react";
import { Leaf, ShieldCheck } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthErrorAlert } from "./AuthErrorAlert";
import { useAuth } from "./AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(form);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[0.9fr_1.1fr]">
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/15"><Leaf className="h-5 w-5" /></div><span className="font-semibold">NutriTrack AI</span></div>
        <div className="max-w-md"><p className="text-sm font-medium uppercase tracking-[0.18em] text-primary-foreground/70">A calmer way to eat well</p><p className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.04em]">Turn everyday meals into a clearer picture of your health.</p><p className="mt-5 text-sm leading-6 text-primary-foreground/75">Log your food, understand your patterns, and make progress that feels measurable.</p></div>
        <div className="flex items-center gap-2 text-sm text-primary-foreground/70"><ShieldCheck className="h-4 w-4" /> Your data stays tied to your account.</div>
      </div>
      <div className="flex items-center justify-center p-5 sm:p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="page-kicker">Welcome back</p>
          <CardTitle className="text-2xl">Sign in to NutriTrack AI</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error ? <AuthErrorAlert message={error} /> : null}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                required
              />
            </div>
            <Button className="w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              New here?{" "}
              <Link className="font-medium text-primary" to="/register">
                Create account
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
