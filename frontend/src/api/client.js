const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000/api/v1";

export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === "true";

const ACCESS_KEY = "taskflow-access-token";
const REFRESH_KEY = "taskflow-refresh-token";

export function getBackendOrigin() {
  return (
    import.meta.env.VITE_BACKEND_ORIGIN?.replace(/\/$/, "") ||
    "http://localhost:8000"
  );
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens({ access_token, refresh_token }) {
  if (access_token) localStorage.setItem(ACCESS_KEY, access_token);
  if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

function parseError(payload, status) {
  if (!payload) return `Request failed (${status})`;
  if (typeof payload === "string") return payload;
  if (payload.detail) {
    if (typeof payload.detail === "string") return payload.detail;
    if (Array.isArray(payload.detail)) {
      return payload.detail.map((item) => item.msg || JSON.stringify(item)).join(", ");
    }
  }
  return payload.message || `Request failed (${status})`;
}

async function parseBody(response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function refreshAccessToken() {
  const refresh_token = getRefreshToken();
  if (!refresh_token) return false;
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token }),
  });
  if (!response.ok) {
    clearTokens();
    return false;
  }
  const data = await response.json();
  setTokens(data);
  return true;
}

export { refreshAccessToken };

function decodeJwtPayload(token) {
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;
    return JSON.parse(atob(segment.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export function isAccessTokenExpired(bufferSeconds = 30) {
  const token = getAccessToken();
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 <= Date.now() + bufferSeconds * 1000;
}

/** Return a valid access token, refreshing via refresh_token when needed. */
export async function ensureAccessToken() {
  if (getAccessToken() && !isAccessTokenExpired()) {
    return getAccessToken();
  }
  if (getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return getAccessToken();
  }
  return getAccessToken();
}

export async function apiRequest(path, options = {}, retry = true) {
  const headers = { ...(options.headers || {}) };
  const isForm = options.body instanceof FormData;
  if (!isForm && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && retry && getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiRequest(path, options, false);
    }
  }

  const data = await parseBody(response);
  if (!response.ok) {
    throw new Error(parseError(data, response.status));
  }
  return data;
}

export const delay = (ms = 180) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
