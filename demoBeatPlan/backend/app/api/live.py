"""WebSocket /ws/live endpoint."""
from __future__ import annotations

from fastapi import APIRouter, WebSocket

from app.live.session import handle_live_websocket

router = APIRouter()


@router.websocket("/ws/live")
async def ws_live(websocket: WebSocket) -> None:
    factory = getattr(websocket.app.state, "live_connect_factory", None)
    await handle_live_websocket(websocket, connect_factory=factory)
