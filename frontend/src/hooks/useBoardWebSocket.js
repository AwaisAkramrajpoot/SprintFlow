import { useEffect, useRef } from "react";

import {
  ensureAccessToken,
  getRefreshToken,
  refreshAccessToken,
  USE_MOCK_API,
} from "../api/client";
import { useTaskFlowStore } from "../store/useTaskFlowStore";

function getWsBaseUrl() {
  const origin =
    import.meta.env.VITE_BACKEND_ORIGIN?.replace(/\/$/, "") ||
    "http://localhost:8000";
  return origin.replace(/^http/i, "ws");
}

export function useBoardWebSocket(projectId) {
  const socketRef = useRef(null);
  const reconnectTimer = useRef(null);
  const connectingRef = useRef(false);

  useEffect(() => {
    if (USE_MOCK_API || !projectId) return undefined;

    let cancelled = false;

    const scheduleReconnect = (delayMs, fn) => {
      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current);
      }
      reconnectTimer.current = window.setTimeout(fn, delayMs);
    };

    const connect = async () => {
      if (cancelled || connectingRef.current) return;
      connectingRef.current = true;

      try {
        const token = await ensureAccessToken();
        if (cancelled || !token) return;

        if (socketRef.current) {
          socketRef.current.close();
          socketRef.current = null;
        }

        const url = `${getWsBaseUrl()}/ws/board?token=${encodeURIComponent(token)}&project_id=${encodeURIComponent(projectId)}`;
        const socket = new WebSocket(url);
        socketRef.current = socket;
        let opened = false;

        socket.onopen = () => {
          opened = true;
          connectingRef.current = false;
        };

        socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === "connected") return;
            useTaskFlowStore.getState().applyRemoteTaskEvent(payload);
          } catch {
            // Ignore malformed messages.
          }
        };

        socket.onerror = () => {
          connectingRef.current = false;
        };

        socket.onclose = async (event) => {
          connectingRef.current = false;
          if (cancelled) return;

          const authFailure =
            !opened || event.code === 4401 || event.code === 1008;

          if (authFailure && getRefreshToken()) {
            const refreshed = await refreshAccessToken();
            if (refreshed && !cancelled) {
              scheduleReconnect(400, connect);
              return;
            }
          }

          scheduleReconnect(2500, connect);
        };
      } catch {
        connectingRef.current = false;
        if (!cancelled) {
          scheduleReconnect(3000, connect);
        }
      }
    };

    connect();

    return () => {
      cancelled = true;
      connectingRef.current = false;
      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [projectId]);
}

export default useBoardWebSocket;
