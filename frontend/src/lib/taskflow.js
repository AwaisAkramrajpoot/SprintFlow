export const boardStatuses = ["Backlog", "In Progress", "Review", "Done"];

export const priorities = ["Urgent", "High", "Medium", "Low"];

export const memberRoles = ["Owner", "Admin", "Manager", "Member"];

export const adminRoles = ["Owner", "Admin"];

export const formatDate = (value) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
};

export const formatDateTime = (value) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
};

export const relativeDueLabel = (value) => {
  const dueDate = new Date(value);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDue = new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate()
  );
  const diffDays = Math.round(
    (startOfDue.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  return `Due in ${diffDays}d`;
};

export const isOverdue = (value, status) => {
  if (!value || status === "Done") return false;
  return relativeDueLabel(value).includes("overdue");
};

export const isDueToday = (value) => relativeDueLabel(value) === "Due today";

export const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const groupByStatus = (tasks) =>
  boardStatuses.reduce((acc, status) => {
    acc[status] = tasks.filter((task) => task.status === status);
    return acc;
  }, {});

export const canManageCompany = (role) => adminRoles.includes(role);

export const createId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
