import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

import { initials } from "../lib/taskflow";
import useTaskFlow, { hydrateWorkspace, useTaskFlowActions } from "../hooks/useTaskFlow";
import { USE_MOCK_API } from "../api/client";
import AiChatSidebar from "./AiChatSidebar";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import TaskDetailModal from "./TaskDetailModal";

const navItems = [
  { to: "/app/dashboard", label: "Dashboard" },
  { to: "/app/projects", label: "Projects" },
  { to: "/app/board", label: "Board" },
  { to: "/app/tasks", label: "Tasks" },
  { to: "/app/search", label: "Search" },
  { to: "/app/ai", label: "AI" },
  { to: "/app/knowledge", label: "Knowledge" },
  { to: "/app/notifications", label: "Notifications" },
  { to: "/app/settings", label: "Settings", adminOnly: true },
];

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentUser,
    company,
    unreadCount,
    notifications,
    canManageCompany,
    apiError,
    apiLoading,
  } = useTaskFlow();
  const { signOut, markAllNotificationsRead, markNotificationRead, closeTask } =
    useTaskFlowActions();
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    closeTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (USE_MOCK_API) return undefined;
    let cancelled = false;
    hydrateWorkspace().catch(() => {
      if (!cancelled) {
        signOut();
        navigate("/login", { replace: true });
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = () => {
    signOut();
    navigate("/login", { replace: true });
  };

  const visibleNav = navItems.filter(
    (item) => !item.adminOnly || canManageCompany
  );

  return (
    <div key={location.pathname} className="tf-app-shell">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] lg:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="relative z-30 border-b border-[var(--tf-border)] bg-white/90 px-5 py-6 backdrop-blur-xl lg:sticky lg:top-0 lg:min-h-screen lg:self-start lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <div className="tf-brand-mark h-11 w-11 text-sm">TF</div>
            <div>
              <p className="tf-display text-[1.05rem] font-bold text-[var(--tf-ink)]">
                TaskFlow AI
              </p>
              <p className="text-[0.8rem] text-[var(--tf-muted)]">{company?.name}</p>
            </div>
          </div>

          <nav className="relative z-30 mt-9 grid gap-1.5" aria-label="Main">
            {visibleNav.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  onClick={() => {
                    setShowNotifications(false);
                    closeTask();
                  }}
                  className={[
                    "tf-nav-link relative z-10 flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-[0.92rem] font-semibold transition duration-200",
                    isActive
                      ? "bg-[var(--tf-accent)] text-white shadow-[0_10px_22px_rgba(15,143,106,0.22)]"
                      : "text-[var(--tf-muted)] hover:bg-[var(--tf-accent-soft)] hover:text-[var(--tf-ink)]",
                  ].join(" ")}
                >
                  <span className="relative z-[1]">{item.label}</span>
                  {item.to === "/app/notifications" && unreadCount > 0 ? (
                    <Badge tone={isActive ? "muted" : "sky"}>{unreadCount}</Badge>
                  ) : null}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-8 rounded-2xl border border-[var(--tf-border)] bg-[var(--tf-bg-1)] p-4">
            <p className="tf-eyebrow">Workspace</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-[var(--tf-ink)]">{company?.plan} Plan</p>
                <p className="text-[0.82rem] text-[var(--tf-muted)]">
                  {currentUser?.title}
                </p>
              </div>
              <Badge tone="sky">{company?.role}</Badge>
            </div>
          </div>
        </aside>

        <div className="relative z-0 flex min-h-screen min-w-0 flex-col overflow-x-hidden">
          <header className="sticky top-0 z-20 border-b border-[var(--tf-border)] bg-white/80 backdrop-blur-xl">
            <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="tf-eyebrow">Your workspace</p>
                <h1 className="tf-title mt-1.5 text-[1.35rem] md:text-[1.5rem]">
                  {company?.name}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative" ref={dropdownRef}>
                  <Button
                    variant="secondary"
                    className="relative"
                    onClick={() => setShowNotifications((current) => !current)}
                  >
                    Notifications
                    {unreadCount > 0 ? (
                      <span className="tf-pulse-dot absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-lg bg-[var(--tf-danger)] px-1 text-[10px] font-bold text-white">
                        {unreadCount}
                      </span>
                    ) : null}
                  </Button>

                  {showNotifications ? (
                    <div className="tf-modal-panel absolute right-0 top-14 z-40 w-[360px] rounded-2xl border border-[var(--tf-border)] bg-white p-3 shadow-[var(--tf-shadow)]">
                      <div className="flex items-center justify-between px-2 pb-2">
                        <p className="text-sm font-semibold text-[var(--tf-ink)]">
                          Latest updates
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            markAllNotificationsRead();
                            setShowNotifications(false);
                          }}
                          className="text-xs font-semibold text-[var(--tf-accent)] transition hover:brightness-110"
                        >
                          Mark all read
                        </button>
                      </div>
                      <div className="max-h-80 space-y-2 overflow-auto">
                        {notifications.slice(0, 5).map((notification) => (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => {
                              markNotificationRead(notification.id);
                              setShowNotifications(false);
                              navigate("/app/notifications");
                            }}
                            className="tf-hover-lift w-full rounded-xl border border-[var(--tf-border)] bg-[var(--tf-bg-1)] p-3 text-left"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <p className="text-sm font-semibold text-[var(--tf-ink)]">
                                {notification.title}
                              </p>
                              {notification.unread ? (
                                <span className="tf-pulse-dot h-2.5 w-2.5 rounded-full bg-[var(--tf-accent)]" />
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm text-[var(--tf-muted)]">
                              {notification.message}
                            </p>
                            <p className="mt-2 text-xs text-[var(--tf-muted)]">
                              {notification.time}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-[var(--tf-border)] bg-white px-3 py-2">
                  <div className="tf-brand-mark h-10 w-10 text-sm">
                    {initials(currentUser?.name)}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-semibold text-[var(--tf-ink)]">
                      {currentUser?.name}
                    </p>
                    <p className="text-xs text-[var(--tf-muted)]">
                      {currentUser?.email}
                    </p>
                  </div>
                </div>

                <Button variant="ghost" onClick={handleSignOut}>
                  Sign out
                </Button>
              </div>
            </div>
          </header>

          <main className="relative z-0 min-w-0 flex-1 px-5 py-7 md:px-7">
            {apiError ? (
              <div className="mb-4 rounded-xl border border-[color-mix(in_srgb,var(--tf-danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--tf-danger)_10%,white)] px-4 py-3 text-sm text-[var(--tf-danger)]">
                {apiError}
              </div>
            ) : null}
            {apiLoading ? (
              <p className="mb-4 text-sm text-[var(--tf-muted)]">Syncing with server…</p>
            ) : null}
            <Outlet key={location.pathname} />
          </main>
        </div>
      </div>

      <TaskDetailModal />
      <AiChatSidebar />
    </div>
  );
}

export default AppLayout;
