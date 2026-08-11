function NotFoundPage() {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-10 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">
        404
      </p>
      <h2 className="mt-4 text-3xl font-semibold text-white">
        Page not found
      </h2>
      <p className="mt-3 text-slate-300">
        The requested route does not exist yet.
      </p>
    </section>
  );
}

export default NotFoundPage;
