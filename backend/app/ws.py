from __future__ import annotations

import os

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect

from app.auth import get_current_user_ws
from app.realtime import ConnectionManager


router = APIRouter(tags=["ws"])

REQUIRE_AUTH_FOR_WS = os.getenv("REQUIRE_AUTH_FOR_WS", "1") == "1"


@router.websocket("/ws/live")
async def ws_live(
    websocket: WebSocket,
    token: str | None = Query(default=None),
):
    # Auth is query-param based for simplicity (Node-RED gateway isn’t a browser).
    # In production, put this behind the frontend reverse-proxy and always require auth.
    if REQUIRE_AUTH_FOR_WS:
        await get_current_user_ws(token)

    manager: ConnectionManager = websocket.app.state.realtime_manager
    await manager.connect(websocket)
    try:
        # Server is broadcast-only for now; keep the socket alive by reading.
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception:
        await manager.disconnect(websocket)
        raise

