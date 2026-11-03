import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sswastik Order Hub — Stall Orders Made Simple" },
      { name: "description", content: "Stall wale products order karein, remark ke saath. Admin sab orders ek jagah dekhe." },
      { property: "og:title", content: "Sswastik Order Hub" },
      { property: "og:description", content: "Stall orders with categories, units and remarks — all in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-hero flex items-center justify-center p-6">
      <div className="max-w-xl text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-3xl text-primary-foreground shadow-warm">
          卐
        </div>
        <h1 className="font-display text-5xl font-bold tracking-tight">Sswastik Order Hub</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Har stall ka order, har product ka remark — seedha admin tak.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/dashboard">Open app</Link>
        </Button>
      </div>
    </div>
  );
}
