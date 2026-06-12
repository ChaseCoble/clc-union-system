import os
from fastapi import APIRouter
from fastapi.responses import FileResponse, Response

router = APIRouter(tags=["frontend"])

FRONTEND_STATIC = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "static")


@router.get("/")
async def serve_panel():
    path = os.path.join(FRONTEND_STATIC, "panel.js")
    if not os.path.exists(path):
        return Response(status_code=404)
    return FileResponse(path, media_type="application/javascript")


@router.get("/foc")
async def serve_focus():
    path = os.path.join(FRONTEND_STATIC, "focus.js")
    if not os.path.exists(path):
        return Response(status_code=404)
    return FileResponse(path, media_type="application/javascript")
