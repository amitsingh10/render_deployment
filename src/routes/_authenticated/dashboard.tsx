import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminOrders, AdminStalls, AdminCatalog, AdminUsers } from "@/components/app/admin-panels";
import { StallPanel } from "@/components/app/stall-panel";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Sswastik Order Hub" },
      { name: "description", content: "Manage stalls, products and orders." },
      { property: "og:title", content: "Dashboard — Sswastik Order Hub" },
      { property: "og:description", content: "Manage stalls, products and orders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["isAdmin", user.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return !!data;
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">卐</span>
            <div>
              <div className="font-display font-bold leading-tight">Sswastik Order Hub</div>
              <div className="text-xs text-muted-foreground">
                {user.email} · {isAdmin ? "Admin" : "Stall user"}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">
        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : isAdmin ? (
          <Tabs defaultValue="orders">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="stalls">Stalls</TabsTrigger>
              <TabsTrigger value="catalog">Products & Categories</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>
            <TabsContent value="orders"><AdminOrders /></TabsContent>
            <TabsContent value="stalls"><AdminStalls /></TabsContent>
            <TabsContent value="catalog"><AdminCatalog /></TabsContent>
            <TabsContent value="users"><AdminUsers /></TabsContent>
          </Tabs>
        ) : (
          <StallPanel userId={user.id} />
        )}
      </main>
    </div>
  );
}
