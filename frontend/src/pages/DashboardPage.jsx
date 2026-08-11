function DashboardPage() {
  const cards = [
    { label: "Projects", value: "0" },
    { label: "Boards", value: "0" },
    { label: "Tasks", value: "0" },
  ];

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">
          Dashboard shell
        </p>
        <h2 className="mt-4 text-3xl font-semibold text-white">
          Placeholder dashboard for Phase 1 development
        </h2>
        <p className="mt-3 max-w-3xl text-slate-300">
          This page is here so the routing stack is real and future project,
          board, and task views can plug in without changing the app shell.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-white/10 bg-slate-950/50 p-6"
          >
            <p className="text-sm text-slate-400">{card.label}</p>
            <p className="mt-2 text-4xl font-semibold text-white">{card.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default DashboardPage;
