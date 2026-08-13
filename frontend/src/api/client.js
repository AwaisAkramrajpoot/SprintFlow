/**
 * HTTP client shell for future FastAPI wiring.
 * Mock mode keeps the UI fully usable without a backend.
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000/api/v1";

export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== "false";

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export async function apiRequest(path, options = {}) {
  if (USE_MOCK_API) {
    throw new Error(
      "apiRequest called while VITE_USE_MOCK_API is enabled. Use mockApi helpers instead."
    );
  }

  const token = localStorage.getItem("taskflow-access-token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed (${response.status})`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const delay = (ms = 180) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
