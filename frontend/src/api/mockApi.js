import { delay, USE_MOCK_API, apiRequest } from "./client";
import { useTaskFlowStore } from "../store/useTaskFlowStore";

async function mock(result) {
  await delay();
  return typeof result === "function" ? result() : result;
}

export const workspaceApi = {
  async getWorkspace() {
    if (!USE_MOCK_API) {
      return apiRequest("/workspace");
    }
    return mock(() => useTaskFlowStore.getState().getSnapshot());
  },

  async getProjects() {
    if (!USE_MOCK_API) {
      return apiRequest("/projects");
    }
    return mock(() => useTaskFlowStore.getState().projects);
  },

  async createProject(payload) {
    if (!USE_MOCK_API) {
      return apiRequest("/projects", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
    return mock(() => useTaskFlowStore.getState().createProject(payload));
  },

  async getTasks(params = {}) {
    if (!USE_MOCK_API) {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/tasks${query ? `?${query}` : ""}`);
    }

    return mock(() => {
      let tasks = useTaskFlowStore.getState().tasks;
      if (params.projectId) {
        tasks = tasks.filter((task) => task.projectId === params.projectId);
      }
      if (params.status && params.status !== "All") {
        tasks = tasks.filter((task) => task.status === params.status);
      }
      if (params.priority && params.priority !== "All") {
        tasks = tasks.filter((task) => task.priority === params.priority);
      }
      if (params.assignee && params.assignee !== "All") {
        tasks = tasks.filter((task) => task.assignee === params.assignee);
      }
      if (params.q) {
        const q = params.q.toLowerCase();
        tasks = tasks.filter(
          (task) =>
            task.title.toLowerCase().includes(q) ||
            task.description.toLowerCase().includes(q)
        );
      }
      return tasks;
    });
  },

  async search(q) {
    if (!USE_MOCK_API) {
      return apiRequest(`/search?q=${encodeURIComponent(q)}`);
    }
    return mock(() => useTaskFlowStore.getState().searchTasks(q));
  },

  async getNotifications() {
    if (!USE_MOCK_API) {
      return apiRequest("/notifications");
    }
    return mock(() => useTaskFlowStore.getState().notifications);
  },

  async getMembers() {
    if (!USE_MOCK_API) {
      return apiRequest("/companies/members");
    }
    return mock(() => useTaskFlowStore.getState().members);
  },
};
