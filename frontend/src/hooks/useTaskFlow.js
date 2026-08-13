import { useShallow } from "zustand/react/shallow";
import { useQuery } from "@tanstack/react-query";

import { USE_MOCK_API } from "../api/client";
import { workspaceApi } from "../api/mockApi";
import { taskflowApi } from "../api/taskflowApi";
import { useTaskFlowStore } from "../store/useTaskFlowStore";

export const queryKeys = {
  workspace: ["workspace"],
  projects: ["projects"],
  tasks: (params) => ["tasks", params],
  notifications: ["notifications"],
  members: ["members"],
  search: (q) => ["search", q],
};

async function runApi(action) {
  const store = useTaskFlowStore.getState();
  store.setApiLoading(true);
  store.setApiError(null);
  try {
    const result = await action();
    const workspace = await taskflowApi.getWorkspace();
    store.hydrateFromServer(workspace);
    return result ?? { ok: true };
  } catch (error) {
    const message = error.message || "Request failed";
    store.setApiError(message);
    return { ok: false, error: message };
  } finally {
    store.setApiLoading(false);
  }
}

export async function hydrateWorkspace() {
  const workspace = await taskflowApi.getWorkspace();
  useTaskFlowStore.getState().hydrateFromServer(workspace);
  return workspace;
}

export function useTaskFlow() {
  const store = useTaskFlowStore();
  return store.getSnapshot();
}

export function useTaskFlowActions() {
  const local = useTaskFlowStore(
    useShallow((state) => ({
      signIn: state.signIn,
      signOut: state.signOut,
      setSelectedProjectId: state.setSelectedProjectId,
      openTask: state.openTask,
      closeTask: state.closeTask,
      updateCompany: state.updateCompany,
      createProject: state.createProject,
      updateProject: state.updateProject,
      deleteProject: state.deleteProject,
      createTask: state.createTask,
      updateTask: state.updateTask,
      moveTask: state.moveTask,
      deleteTask: state.deleteTask,
      addComment: state.addComment,
      deleteComment: state.deleteComment,
      addAttachment: state.addAttachment,
      removeAttachment: state.removeAttachment,
      toggleChecklistItem: state.toggleChecklistItem,
      addChecklistItem: state.addChecklistItem,
      inviteMember: state.inviteMember,
      updateMemberRole: state.updateMemberRole,
      removeMember: state.removeMember,
      markNotificationRead: state.markNotificationRead,
      markAllNotificationsRead: state.markAllNotificationsRead,
      searchTasks: state.searchTasks,
      resetWorkspace: state.resetWorkspace,
    }))
  );

  if (USE_MOCK_API) {
    return local;
  }

  return {
    ...local,
    signIn: async ({ name, email, password, companyName, mode = "login", inviteToken }) => {
      if (mode === "login") {
        await taskflowApi.login({ email, password });
      } else {
        await taskflowApi.register({
          full_name: name,
          email,
          password,
          company_name: mode === "create" ? companyName : null,
          invite_token: inviteToken || null,
        });
      }
      await hydrateWorkspace();
    },
    signOut: async () => {
      try {
        await taskflowApi.logout();
      } finally {
        local.signOut();
      }
    },
    updateCompany: (patch) => runApi(() => taskflowApi.updateCompany(patch)),
    createProject: (project) =>
      runApi(() =>
        taskflowApi.createProject({
          name: project.name,
          description: project.description,
        })
      ),
    updateProject: (projectId, patch) =>
      runApi(() => taskflowApi.updateProject(projectId, patch)),
    deleteProject: (projectId) => runApi(() => taskflowApi.deleteProject(projectId)),
    createTask: (task) =>
      runApi(async () => {
        const created = await taskflowApi.createTask({
          project_id: task.projectId,
          title: task.title,
          description: task.description,
          assignee: task.assignee,
          assignee_id: task.assigneeId,
          priority: task.priority,
          due_date: task.dueDate || null,
          status: task.status,
        });

        if (task.files?.length) {
          for (const file of task.files) {
            await taskflowApi.uploadAttachment(created.id, file);
          }
        }

        return created;
      }),
    updateTask: async (taskId, patch) => {
      if (patch.assignee || patch.assigneeId) {
        return runApi(() =>
          taskflowApi.assignTask(taskId, {
            assignee: patch.assignee,
            assignee_id: patch.assigneeId,
          })
        );
      }
      return runApi(() =>
        taskflowApi.updateTask(taskId, {
          title: patch.title,
          description: patch.description,
          priority: patch.priority,
          due_date: patch.dueDate,
          status: patch.status,
          column_id: patch.columnId,
        })
      );
    },
    moveTask: async (taskId, status) => {
      // Optimistic UI so the board does not snap back while the API runs.
      local.moveTask(taskId, status);
      return runApi(() => taskflowApi.moveTask(taskId, { status }));
    },
    deleteTask: async (taskId) => {
      const result = await runApi(() => taskflowApi.deleteTask(taskId));
      local.closeTask();
      return result;
    },
    addComment: (taskId, content) =>
      runApi(() => taskflowApi.addComment({ task_id: taskId, content })),
    deleteComment: (_taskId, commentId) =>
      runApi(() => taskflowApi.deleteComment(commentId)),
    addAttachment: async (taskId, attachment) => {
      if (attachment.file) {
        return runApi(() => taskflowApi.uploadAttachment(taskId, attachment.file));
      }
      const file = new File([attachment.name || "note.txt"], attachment.name || "note.txt", {
        type: "text/plain",
      });
      return runApi(() => taskflowApi.uploadAttachment(taskId, file));
    },
    removeAttachment: (_taskId, attachmentId) =>
      runApi(() => taskflowApi.deleteAttachment(attachmentId)),
    inviteMember: (member) =>
      runApi(() =>
        taskflowApi.inviteMember({
          email: member.email,
          role: member.role || "Member",
          name: member.name,
        })
      ),
    updateMemberRole: (memberId, role) =>
      runApi(() => taskflowApi.updateMemberRole(memberId, role)),
    removeMember: (memberId) => runApi(() => taskflowApi.removeMember(memberId)),
    markNotificationRead: (notificationId) =>
      runApi(() => taskflowApi.markNotificationRead(notificationId)),
    markAllNotificationsRead: () =>
      runApi(() => taskflowApi.markAllNotificationsRead()),
    searchTasks: async (query) => {
      const data = await taskflowApi.search(query);
      return data.items || [];
    },
  };
}

export function useWorkspaceQuery() {
  return useQuery({
    queryKey: queryKeys.workspace,
    queryFn: () =>
      USE_MOCK_API ? workspaceApi.getWorkspace() : taskflowApi.getWorkspace(),
  });
}

export function useProjectsQuery() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: () =>
      USE_MOCK_API ? workspaceApi.getProjects() : taskflowApi.listProjects(),
  });
}

export function useTasksQuery(params = {}) {
  return useQuery({
    queryKey: queryKeys.tasks(params),
    queryFn: () =>
      USE_MOCK_API
        ? workspaceApi.getTasks(params)
        : taskflowApi.listTasks({
            project_id: params.projectId,
            status: params.status,
            priority: params.priority,
            q: params.q,
          }),
  });
}

export function useNotificationsQuery() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () =>
      USE_MOCK_API
        ? workspaceApi.getNotifications()
        : taskflowApi.listNotifications(),
  });
}

export function useSearchQuery(q) {
  return useQuery({
    queryKey: queryKeys.search(q),
    queryFn: async () => {
      if (USE_MOCK_API) return workspaceApi.search(q);
      const data = await taskflowApi.search(q);
      return data.items || [];
    },
    enabled: q.trim().length > 0,
  });
}

export default useTaskFlow;
