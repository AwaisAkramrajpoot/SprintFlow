import { apiRequest, setTokens, clearTokens, getRefreshToken } from "./client";

export const taskflowApi = {
  async register(payload) {
    const data = await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setTokens(data.tokens);
    return data;
  },

  async login(payload) {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setTokens(data.tokens);
    return data;
  },

  async logout() {
    try {
      await apiRequest("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: getRefreshToken() }),
      });
    } finally {
      clearTokens();
    }
  },

  getMe() {
    return apiRequest("/auth/me");
  },

  getWorkspace() {
    return apiRequest("/companies/workspace");
  },

  updateCompany(payload) {
    return apiRequest("/companies/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  inviteMember(payload) {
    return apiRequest("/companies/invite", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateMemberRole(memberId, role) {
    return apiRequest(`/companies/members/${memberId}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  },

  removeMember(memberId) {
    return apiRequest(`/companies/members/${memberId}`, { method: "DELETE" });
  },

  listProjects(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/projects${query ? `?${query}` : ""}`);
  },

  createProject(payload) {
    return apiRequest("/projects", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateProject(projectId, payload) {
    return apiRequest(`/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteProject(projectId) {
    return apiRequest(`/projects/${projectId}`, { method: "DELETE" });
  },

  listTasks(params = {}) {
    const cleaned = Object.fromEntries(
      Object.entries(params).filter(
        ([, value]) => value !== undefined && value !== null && value !== "" && value !== "All"
      )
    );
    const query = new URLSearchParams(cleaned).toString();
    return apiRequest(`/tasks${query ? `?${query}` : ""}`);
  },

  createTask(payload) {
    return apiRequest("/tasks", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateTask(taskId, payload) {
    return apiRequest(`/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  moveTask(taskId, payload) {
    return apiRequest(`/tasks/${taskId}/move`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  assignTask(taskId, payload) {
    return apiRequest(`/tasks/${taskId}/assign`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  deleteTask(taskId) {
    return apiRequest(`/tasks/${taskId}`, { method: "DELETE" });
  },

  addComment(payload) {
    return apiRequest("/comments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  deleteComment(commentId) {
    return apiRequest(`/comments/${commentId}`, { method: "DELETE" });
  },

  uploadAttachment(taskId, file) {
    const body = new FormData();
    body.append("file", file);
    return apiRequest(`/attachments?task_id=${encodeURIComponent(taskId)}`, {
      method: "POST",
      body,
    });
  },

  deleteAttachment(attachmentId) {
    return apiRequest(`/attachments/${attachmentId}`, { method: "DELETE" });
  },

  listNotifications(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/notifications${query ? `?${query}` : ""}`);
  },

  markNotificationRead(id) {
    return apiRequest(`/notifications/${id}/read`, { method: "PATCH" });
  },

  markAllNotificationsRead() {
    return apiRequest("/notifications/read-all", { method: "POST" });
  },

  search(q) {
    return apiRequest(`/search?q=${encodeURIComponent(q)}`);
  },
};
