import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import PageShell from "../components/PageShell";
import SectionHeading from "../components/SectionHeading";
import useTaskFlow, { useTaskFlowActions } from "../hooks/useTaskFlow";

function NotificationsPage() {
  const { notifications, unreadCount } = useTaskFlow();
  const { markAllNotificationsRead, markNotificationRead } = useTaskFlowActions();

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Notifications"
        title="Company alerts and activity feed"
        description="Assignments, board updates, comments, and digests — with unread counts and mark-as-read actions."
        actions={[
          <Button key="mark" variant="secondary" onClick={markAllNotificationsRead}>
            Mark all read ({unreadCount})
          </Button>,
        ]}
      />

      <div className="tf-stagger grid gap-4">
        {notifications.map((notification) => (
          <Card key={notification.id} className="tf-hover-lift p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="tf-display text-lg font-bold text-white">
                    {notification.title}
                  </p>
                  {notification.unread ? <Badge tone="sky">Unread</Badge> : null}
                  {notification.type ? (
                    <Badge tone="muted">{notification.type}</Badge>
                  ) : null}
                </div>
                <p className="text-[var(--tf-muted)]">{notification.message}</p>
                <p className="text-sm text-[var(--tf-faint)]">{notification.time}</p>
              </div>
              {notification.unread ? (
                <Button
                  variant="secondary"
                  onClick={() => markNotificationRead(notification.id)}
                >
                  Mark read
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

export default NotificationsPage;
