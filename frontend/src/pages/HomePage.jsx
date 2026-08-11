function HomePage() {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">
          Phase 1, Step 1
        </p>
        <h2 className="mt-4 text-4xl font-semibold leading-tight text-white">
          Backend, frontend, database, and deployment scaffolding in place.
        </h2>
        <p className="mt-4 max-w-2xl text-base text-slate-300">
          This starter now has a FastAPI health route, Alembic wiring, a React
          Router shell, and Tailwind-ready styling so the rest of TaskFlow AI
          can grow cleanly from here.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm text-sky-200">
            FastAPI
          </span>
          <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm text-sky-200">
            PostgreSQL
          </span>
          <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm text-sky-200">
            React Router
          </span>
          <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm text-sky-200">
            Tailwind
          </span>
        </div>
      </div>

      <aside className="rounded-[2rem] border border-white/10 bg-slate-950/40 p-8">
        <h3 className="text-lg font-semibold text-white">What is ready</h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-300">
          <li>Backend folder structure under `app/core`, `app/db`, and `app/api/v1`</li>
          <li>Health endpoint at `/health`</li>
          <li>Alembic config files in `backend/alembic/`</li>
          <li>Frontend routes for landing and dashboard pages</li>
          <li>Tailwind v4 integration via the Vite plugin</li>
        </ul>
      </aside>
    </section>
  );
}

export default HomePage;
