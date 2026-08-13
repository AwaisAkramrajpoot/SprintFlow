from __future__ import annotations

import asyncio
import json
import logging
from collections import defaultdict
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger("taskflow.websocket")


class ConnectionManager:
    """Tracks active WebSocket connections per company/project board room."""

    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    @staticmethod
    def room_key(company_id: str, project_id: str) -> str:
        return f"{company_id}:{project_id}"

    async def connect(
        self, websocket: WebSocket, company_id: str, project_id: str
    ) -> None:
        await websocket.accept()
        key = self.room_key(company_id, project_id)
        async with self._lock:
            self._connections[key].add(websocket)
        logger.info("WS connected room=%s total=%s", key, len(self._connections[key]))

    async def disconnect(
        self, websocket: WebSocket, company_id: str, project_id: str
    ) -> None:
        key = self.room_key(company_id, project_id)
        async with self._lock:
            room = self._connections.get(key)
            if room and websocket in room:
                room.remove(websocket)
            if room is not None and len(room) == 0:
                self._connections.pop(key, None)

    async def broadcast(
        self, company_id: str, project_id: str, message: dict[str, Any]
    ) -> None:
        key = self.room_key(company_id, project_id)
        payload = json.dumps(message, default=str)
        async with self._lock:
            sockets = list(self._connections.get(key, set()))
        if not sockets:
            return
        dead: list[WebSocket] = []
        for socket in sockets:
            try:
                await socket.send_text(payload)
            except Exception:
                dead.append(socket)
        if dead:
            async with self._lock:
                room = self._connections.get(key, set())
                for socket in dead:
                    room.discard(socket)

    def connection_count(self, company_id: str, project_id: str) -> int:
        return len(self._connections.get(self.room_key(company_id, project_id), set()))


manager = ConnectionManager()
