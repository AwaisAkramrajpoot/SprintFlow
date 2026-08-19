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

  generateTasks(payload) {
    return apiRequest("/ai/generate-tasks", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  commitGeneratedTasks(payload) {
    return apiRequest("/ai/commit-tasks", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  estimateTask(payload) {
    return apiRequest("/ai/estimate-task", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  generateDescription(payload) {
    return apiRequest("/ai/generate-description", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  planSprint(payload) {
    return apiRequest("/ai/plan-sprint", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  uploadMeeting(file, { projectId, createTasks } = {}) {
    const body = new FormData();
    body.append("file", file);
    if (projectId) body.append("project_id", projectId);
    body.append("create_tasks", createTasks ? "true" : "false");
    return apiRequest("/ai/meeting-summary", { method: "POST", body });
  },

  getAiJob(jobId) {
    return apiRequest(`/ai/jobs/${jobId}`);
  },

  summarizeComments(taskId) {
    return apiRequest(`/ai/summarize-comments/${taskId}`, { method: "POST" });
  },

  nlSearch(payload) {
    return apiRequest("/ai/nl-search", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  aiChat(payload) {
    return apiRequest("/ai/chat", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  dailyReport(payload = {}) {
    return apiRequest("/ai/daily-report", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  reviewCode(file) {
    const body = new FormData();
    body.append("file", file);
    return apiRequest("/ai/review-code", { method: "POST", body });
  },

  predictRisk(payload = {}) {
    return apiRequest("/ai/predict-risk", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  uploadKnowledgeDocument(file) {
    const body = new FormData();
    body.append("file", file);
    return apiRequest("/knowledge-base/upload", { method: "POST", body });
  },

  listKnowledgeDocuments() {
    return apiRequest("/knowledge-base/documents");
  },

  getKnowledgeDocument(documentId) {
    return apiRequest(`/knowledge-base/documents/${documentId}`);
  },

  deleteKnowledgeDocument(documentId) {
    return apiRequest(`/knowledge-base/documents/${documentId}`, { method: "DELETE" });
  },

  reprocessKnowledgeDocument(documentId) {
    return apiRequest(`/knowledge-base/documents/${documentId}/reprocess`, {
      method: "POST",
    });
  },

  askKnowledgeBase(payload) {
    return apiRequest("/knowledge-base/ask", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
