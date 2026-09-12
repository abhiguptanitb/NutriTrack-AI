import { FormEvent, useState } from "react";
import { Leaf, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthErrorAlert } from "./AuthErrorAlert";
import { useAuth } from "./AuthContext";

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await register(form);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[0.9fr_1.1fr]">
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/15"><Leaf className="h-5 w-5" /></div><span className="font-semibold">NutriTrack AI</span></div>
        <div className="max-w-md"><p className="text-sm font-medium uppercase tracking-[0.18em] text-primary-foreground/70">Build a better baseline</p><p className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.04em]">Small, consistent choices add up.</p><p className="mt-5 text-sm leading-6 text-primary-foreground/75">Start with a goal, log a few meals, and let your dashboard reveal the signal.</p></div>
        <div className="flex items-center gap-2 text-sm text-primary-foreground/70"><ShieldCheck className="h-4 w-4" /> Private by default.</div>
      </div>
      <div className="flex items-center justify-center p-5 sm:p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="page-kicker">Start your baseline</p>
          <CardTitle className="text-2xl">Create your account</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error ? <AuthErrorAlert message={error} /> : null}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Abhi Gupta"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </div>
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
              <div className="rounded-md bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
                <p className="font-medium text-foreground">Password must contain:</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  <li>At least 8 characters</li>
                  <li>One uppercase letter</li>
                  <li>One number</li>
                </ul>
              </div>
            </div>
            <Button className="w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already registered?{" "}
              <Link className="font-medium text-primary" to="/login">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
