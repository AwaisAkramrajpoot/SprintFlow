import { create } from "zustand";

import { seed } from "../data/taskflowSeed";
import {
  boardStatuses,
  canManageCompany,
  createId,
  groupByStatus,
} from "../lib/taskflow";

const SESSION_KEY = "taskflow-session";
const WORKSPACE_KEY = "taskflow-workspace";

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const cloneSeed = () => structuredClone(seed);

const loadWorkspace = () => {
  const saved = readJson(WORKSPACE_KEY, null);
  if (!saved) {
    return cloneSeed();
  }

  return {
    company: saved.company ?? cloneSeed().company,
    projects: saved.projects ?? cloneSeed().projects,
    tasks: saved.tasks ?? cloneSeed().tasks,
    members: saved.members ?? cloneSeed().members,
    notifications: saved.notifications ?? cloneSeed().notifications,
    activities: saved.activities ?? cloneSeed().activities,
  };
};

const persistWorkspace = (state) => {
  writeJson(WORKSPACE_KEY, {
    company: state.company,
    projects: state.projects,
    tasks: state.tasks,
    members: state.members,
    notifications: state.notifications,
    activities: state.activities,
  });
};

const pushActivity = (activities, title, detail) => [
  {
    id: createId("act"),
    title,
    detail,
    time: "Just now",
  },
  ...activities,
].slice(0, 20);

const pushNotification = (notifications, payload) => [
  {
    id: createId("n"),
    unread: true,
    time: "Just now",
    type: "system",
    ...payload,
  },
  ...notifications,
];

export const useTaskFlowStore = create((set, get) => {
  const workspace = loadWorkspace();
  const session = readJson(SESSION_KEY, null);

  return {
    session,
    company: workspace.company,
    projects: workspace.projects,
    tasks: workspace.tasks,
    members: workspace.members,
    notifications: workspace.notifications,
    activities: workspace.activities,
    selectedProjectId: workspace.projects[0]?.id ?? null,
    activeTaskId: null,

    getSnapshot: () => {
      const state = get();
      const currentUser = state.session
        ? {
            ...state.members.find((m) => m.email === state.session.email),
            ...state.session,
            role:
              state.session.role ||
              state.members.find((m) => m.email === state.session.email)?.role ||
              "Member",
          }
        : seed.user;

      const currentProject =
        state.projects.find((project) => project.id === state.selectedProjectId) ??
        state.projects[0] ??
        null;

      const projectTasks = currentProject
        ? state.tasks.filter((task) => task.projectId === currentProject.id)
        : [];

      const activeTask = state.activeTaskId
        ? state.tasks.find((task) => task.id === state.activeTaskId) ?? null
        : null;

      const myTasks = state.session
        ? state.tasks.filter(
            (task) =>
              task.assignee === state.session.name ||
              task.assigneeId === currentUser.id
          )
        : [];

      return {
        session: state.session,
        currentUser,
        isAuthenticated: Boolean(state.session),
        company: {
          ...state.company,
          role: currentUser.role,
        },
        projects: state.projects,
        tasks: state.tasks,
        members: state.members,
        notifications: state.notifications,
        activities: state.activities,
        selectedProjectId: state.selectedProjectId,
        currentProject,
        projectTasks,
        boardGroups: groupByStatus(projectTasks),
        activeTask,
        activeTaskId: state.activeTaskId,
        unreadCount: state.notifications.filter((item) => item.unread).length,
        myTasks,
        canManageCompany: canManageCompany(currentUser.role),
      };
    },

    signIn: ({ name, email, role, companyName, mode = "login" }) => {
      const state = get();
      const matched = state.members.find(
        (member) => member.email.toLowerCase() === email.toLowerCase()
      );

      const nextSession = {
        id: matched?.id ?? createId("u"),
        name: name || matched?.name || "Workspace User",
        email,
        title: matched?.title || "Team Member",
        role: role || matched?.role || "Owner",
      };

      let company = state.company;
      let members = state.members;

      if (mode === "create" && companyName) {
        company = {
          ...state.company,
          name: companyName,
        };
      }

      if (!matched && (mode === "register" || mode === "create" || mode === "join")) {
        members = [
          {
            id: nextSession.id,
            name: nextSession.name,
            email: nextSession.email,
            role: nextSession.role,
            status: "Online",
          },
          ...state.members,
        ];
      }

      writeJson(SESSION_KEY, nextSession);
      set({ session: nextSession, company, members });
      persistWorkspace(get());
    },

    signOut: () => {
      localStorage.removeItem(SESSION_KEY);
      set({ session: null, activeTaskId: null });
    },

    setSelectedProjectId: (projectId) => {
      set({ selectedProjectId: projectId });
    },

    openTask: (taskId) => {
      if (!taskId) return;
      set({ activeTaskId: taskId });
    },

    closeTask: () => {
      set({ activeTaskId: null });
    },

    updateCompany: (patch) => {
      const state = get();
      if (!canManageCompany(state.getSnapshot().currentUser.role)) {
        return { ok: false, error: "Only Owner or Admin can update company settings." };
      }

      set({
        company: { ...state.company, ...patch },
        activities: pushActivity(
          state.activities,
          "Company updated",
          "Company profile settings were changed."
        ),
      });
      persistWorkspace(get());
      return { ok: true };
    },

    createProject: (project) => {
      const state = get();
      const user = state.getSnapshot().currentUser;
      const newProject = {
        id: createId("prj"),
        progress: 0,
        status: "On Track",
        members: 1,
        lead: user.name,
        dueDate: project.dueDate || new Date().toISOString().slice(0, 10),
        ...project,
      };

      set({
        projects: [newProject, ...state.projects],
        selectedProjectId: newProject.id,
        activities: pushActivity(
          state.activities,
          "Project created",
          `${newProject.name} was added to the workspace.`
        ),
      });
      persistWorkspace(get());
      return newProject;
    },

    updateProject: (projectId, patch) => {
      const state = get();
      set({
        projects: state.projects.map((project) =>
          project.id === projectId ? { ...project, ...patch } : project
        ),
      });
      persistWorkspace(get());
    },

    deleteProject: (projectId) => {
      const state = get();
      const remaining = state.projects.filter((project) => project.id !== projectId);
      set({
        projects: remaining,
        tasks: state.tasks.filter((task) => task.projectId !== projectId),
        selectedProjectId:
          state.selectedProjectId === projectId
            ? remaining[0]?.id ?? null
            : state.selectedProjectId,
        activities: pushActivity(
          state.activities,
          "Project deleted",
          "A project and its tasks were removed."
        ),
      });
      persistWorkspace(get());
    },

    createTask: (task) => {
      const state = get();
      const member = state.members.find(
        (item) => item.name === task.assignee || item.id === task.assigneeId
      );

      const newTask = {
        id: createId("tsk"),
        comments: [],
        attachments: [],
        checklist: [],
        status: "Backlog",
        priority: "Medium",
        createdBy: state.getSnapshot().currentUser.name,
        assigneeId: member?.id ?? task.assigneeId ?? null,
        assignee: member?.name ?? task.assignee ?? "Unassigned",
        ...task,
      };

      set({
        tasks: [newTask, ...state.tasks],
        notifications: pushNotification(state.notifications, {
          title: "Task created",
          message: `${newTask.title} was added to the board.`,
          type: "board",
        }),
        activities: pushActivity(
          state.activities,
          "Task created",
          `${newTask.title} was created.`
        ),
      });
      persistWorkspace(get());
      return newTask;
    },

    updateTask: (taskId, patch) => {
      const state = get();
      let notifications = state.notifications;
      let activities = state.activities;

      const nextTasks = state.tasks.map((task) => {
        if (task.id !== taskId) return task;

        const next = { ...task, ...patch };

        if (patch.assignee && patch.assignee !== task.assignee) {
          const member = state.members.find((item) => item.name === patch.assignee);
          next.assigneeId = member?.id ?? next.assigneeId;
          notifications = pushNotification(notifications, {
            title: "Task assigned",
            message: `${next.title} was assigned to ${next.assignee}.`,
            type: "assignment",
          });
          activities = pushActivity(
            activities,
            "Task assigned",
            `${next.title} → ${next.assignee}`
          );
        }

        return next;
      });

      set({ tasks: nextTasks, notifications, activities });
      persistWorkspace(get());
    },

    moveTask: (taskId, status) => {
      if (!boardStatuses.includes(status)) return;
      const state = get();
      const task = state.tasks.find((item) => item.id === taskId);
      if (!task || task.status === status) return;

      set({
        tasks: state.tasks.map((item) =>
          item.id === taskId ? { ...item, status } : item
        ),
        activities: pushActivity(
          state.activities,
          "Task moved",
          `${task.title} moved to ${status}.`
        ),
      });
      persistWorkspace(get());
    },

    deleteTask: (taskId) => {
      const state = get();
      const task = state.tasks.find((item) => item.id === taskId);
      set({
        tasks: state.tasks.filter((item) => item.id !== taskId),
        activeTaskId: state.activeTaskId === taskId ? null : state.activeTaskId,
        activities: pushActivity(
          state.activities,
          "Task deleted",
          task ? `${task.title} was removed.` : "A task was removed."
        ),
      });
      persistWorkspace(get());
    },

    addComment: (taskId, content) => {
      const state = get();
      const user = state.getSnapshot().currentUser;
      const comment = {
        id: createId("c"),
        userId: user.id,
        author: user.name,
        content,
        createdAt: new Date().toISOString(),
      };

      set({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? { ...task, comments: [...(task.comments || []), comment] }
            : task
        ),
        notifications: pushNotification(state.notifications, {
          title: "Comment added",
          message: `${user.name} commented on a task.`,
          type: "comment",
        }),
      });
      persistWorkspace(get());
      return comment;
    },

    deleteComment: (taskId, commentId) => {
      const state = get();
      const user = state.getSnapshot().currentUser;

      set({
        tasks: state.tasks.map((task) => {
          if (task.id !== taskId) return task;
          return {
            ...task,
            comments: (task.comments || []).filter((comment) => {
              if (comment.id !== commentId) return true;
              return !(
                comment.userId === user.id ||
                canManageCompany(user.role)
              );
            }),
          };
        }),
      });
      persistWorkspace(get());
    },

    addAttachment: (taskId, attachment) => {
      const state = get();
      const user = state.getSnapshot().currentUser;
      const next = {
        id: createId("a"),
        uploadedBy: user.name,
        uploadedAt: new Date().toISOString().slice(0, 10),
        size: attachment.size || "—",
        name: attachment.name,
      };

      set({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? { ...task, attachments: [...(task.attachments || []), next] }
            : task
        ),
      });
      persistWorkspace(get());
      return next;
    },

    removeAttachment: (taskId, attachmentId) => {
      const state = get();
      set({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                attachments: (task.attachments || []).filter(
                  (item) => item.id !== attachmentId
                ),
              }
            : task
        ),
      });
      persistWorkspace(get());
    },

    toggleChecklistItem: (taskId, itemId) => {
      const state = get();
      set({
        tasks: state.tasks.map((task) => {
          if (task.id !== taskId) return task;
          return {
            ...task,
            checklist: (task.checklist || []).map((item) =>
              item.id === itemId ? { ...item, done: !item.done } : item
            ),
          };
        }),
      });
      persistWorkspace(get());
    },

    addChecklistItem: (taskId, text) => {
      const state = get();
      const item = { id: createId("cl"), text, done: false };
      set({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? { ...task, checklist: [...(task.checklist || []), item] }
            : task
        ),
      });
      persistWorkspace(get());
    },

    inviteMember: (member) => {
      const state = get();
      if (!canManageCompany(state.getSnapshot().currentUser.role)) {
        return { ok: false, error: "Only Owner or Admin can invite members." };
      }

      const invited = {
        id: createId("u"),
        status: "Invited",
        role: member.role || "Member",
        ...member,
      };

      set({
        members: [invited, ...state.members],
        notifications: pushNotification(state.notifications, {
          title: "Member invited",
          message: `${invited.email} was invited as ${invited.role}.`,
          type: "system",
        }),
        activities: pushActivity(
          state.activities,
          "Member invited",
          `${invited.name || invited.email} joined the invite list.`
        ),
      });
      persistWorkspace(get());
      return { ok: true, member: invited };
    },

    updateMemberRole: (memberId, role) => {
      const state = get();
      if (!canManageCompany(state.getSnapshot().currentUser.role)) {
        return { ok: false, error: "Only Owner or Admin can change roles." };
      }

      set({
        members: state.members.map((member) =>
          member.id === memberId ? { ...member, role } : member
        ),
      });
      persistWorkspace(get());
      return { ok: true };
    },

    removeMember: (memberId) => {
      const state = get();
      if (!canManageCompany(state.getSnapshot().currentUser.role)) {
        return { ok: false, error: "Only Owner or Admin can remove members." };
      }

      const target = state.members.find((member) => member.id === memberId);
      if (target?.role === "Owner") {
        return { ok: false, error: "Owner cannot be removed." };
      }

      set({
        members: state.members.filter((member) => member.id !== memberId),
      });
      persistWorkspace(get());
      return { ok: true };
    },

    markNotificationRead: (notificationId) => {
      const state = get();
      set({
        notifications: state.notifications.map((item) =>
          item.id === notificationId ? { ...item, unread: false } : item
        ),
      });
      persistWorkspace(get());
    },

    markAllNotificationsRead: () => {
      const state = get();
      set({
        notifications: state.notifications.map((item) => ({
          ...item,
          unread: false,
        })),
      });
      persistWorkspace(get());
    },

    searchTasks: (query) => {
      const q = query.trim().toLowerCase();
      if (!q) return get().tasks;
      return get().tasks.filter(
        (task) =>
          task.title.toLowerCase().includes(q) ||
          task.description.toLowerCase().includes(q) ||
          task.assignee?.toLowerCase().includes(q)
      );
    },

    resetWorkspace: () => {
      const fresh = cloneSeed();
      writeJson(WORKSPACE_KEY, fresh);
      set({
        ...fresh,
        selectedProjectId: fresh.projects[0]?.id ?? null,
        activeTaskId: null,
      });
    },
  };
});
