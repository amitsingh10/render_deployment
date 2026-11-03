import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { loginToEmail } from "@/lib/username";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Sswastik Order Hub" },
      { name: "description", content: "Sign in to place and manage stall orders." },
      { property: "og:title", content: "Sign in — Sswastik Order Hub" },
      { property: "og:description", content: "Sign in to place and manage stall orders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
    supabase.rpc("admin_exists").then(({ data }) => setAdminExists(!!data));
  }, [navigate]);

  const setup = adminExists === false;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (setup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Admin account bana diya. Email confirm karke sign in karein.");
          setAdminExists(true);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: loginToEmail(email), password });
        if (error) throw new Error("Login ID ya password galat hai");
      }
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-hero flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-warm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground">
            卐
          </div>
          <h1 className="font-display text-2xl font-bold">Sswastik Order Hub</h1>
          <p className="text-sm text-muted-foreground">
            {setup ? "Pehla admin account banayein" : "Apne account se sign in karein"}
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {setup && (
            <div className="space-y-1.5">
              <Label>Naam</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>{setup ? "Email" : "Login ID"}</Label>
            <Input type={setup ? "email" : "text"} autoCapitalize="none" placeholder={setup ? "" : "Stall login ID (admin: email)"} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <Button type="submit" className="w-full" disabled={busy || adminExists === null}>
            {setup ? "Admin account banayein" : "Sign in"}
          </Button>
        </form>
        {!setup && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Account admin dwara banaya jata hai.
          </p>
        )}
      </div>
    </div>
  );
}
