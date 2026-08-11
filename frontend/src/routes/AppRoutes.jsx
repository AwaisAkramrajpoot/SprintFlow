import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";

import DashboardPage from "../pages/DashboardPage";
import HomePage from "../pages/HomePage";
import NotFoundPage from "../pages/NotFoundPage";

const navLinkClassName = ({ isActive }) =>
  [
    "rounded-full px-4 py-2 text-sm font-medium transition",
    isActive
      ? "bg-sky-400 text-slate-950"
      : "text-slate-300 hover:bg-white/10 hover:text-white",
  ].join(" ");

function AppRoutes() {
  return (
    <BrowserRouter>
      <div className="min-h-screen text-slate-100">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-300">
              TaskFlow AI
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-white">
              Project management platform scaffold
            </h1>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            <NavLink to="/" className={navLinkClassName}>
              Home
            </NavLink>
            <NavLink to="/dashboard" className={navLinkClassName}>
              Dashboard
            </NavLink>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl px-6 pb-12">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default AppRoutes;
