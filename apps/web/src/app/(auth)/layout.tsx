export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 p-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden space-y-5 rounded-3xl border bg-white/80 p-8 shadow-sm backdrop-blur lg:block">
        <p className="inline-flex rounded-full border bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
          POS SaaS Platform
        </p>
        <h1 className="text-4xl font-bold leading-tight text-foreground">
          Multi-tenant retail operations with super admin governance.
        </h1>
        <p className="text-sm text-muted-foreground">
          Billing, inventory, reporting, subscriptions, and role-based control in one operational workspace.
        </p>
      </section>
      <section className="flex justify-center">{children}</section>
    </div>
  );
}
