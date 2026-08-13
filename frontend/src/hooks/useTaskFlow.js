import { useShallow } from "zustand/react/shallow";
import { useQuery } from "@tanstack/react-query";

import { workspaceApi } from "../api/mockApi";
import { useTaskFlowStore } from "../store/useTaskFlowStore";

export const queryKeys = {
  workspace: ["workspace"],
  projects: ["projects"],
  tasks: (params) => ["tasks", params],
  notifications: ["notifications"],
  members: ["members"],
  search: (q) => ["search", q],
};

/** Live store snapshot for interactive UI (Kanban, modals). */
export function useTaskFlow() {
  const store = useTaskFlowStore();
  return store.getSnapshot();
}

export function useTaskFlowActions() {
  return useTaskFlowStore(
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
}

export function useWorkspaceQuery() {
  return useQuery({
    queryKey: queryKeys.workspace,
    queryFn: () => workspaceApi.getWorkspace(),
  });
}

export function useProjectsQuery() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => workspaceApi.getProjects(),
  });
}

export function useTasksQuery(params = {}) {
  return useQuery({
    queryKey: queryKeys.tasks(params),
    queryFn: () => workspaceApi.getTasks(params),
  });
}

export function useNotificationsQuery() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => workspaceApi.getNotifications(),
  });
}

export function useSearchQuery(q) {
  return useQuery({
    queryKey: queryKeys.search(q),
    queryFn: () => workspaceApi.search(q),
    enabled: q.trim().length > 0,
  });
}

export default useTaskFlow;
