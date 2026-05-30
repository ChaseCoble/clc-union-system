# routers/auth.py
import httpx
from fastapi import APIRouter, Request, Response, HTTPException
from backend.config import get_config
from fastapi.responses import JSONResponse
router = APIRouter(prefix="/auth", tags=["auth"])
@router.post("/login")
async def login(request: Request):
    
    config = get_config()
    body = await request.json()
    timeout = httpx.Timeout(connect=5.0, read=30.0, write=5.0, pool=5.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(
            f"{config.orchestrator_url}/auth/login",
            json=body,
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.json())

    json_response = JSONResponse(content=resp.json())
    for header_name, header_value in resp.headers.multi_items():
        if header_name.lower() == "set-cookie":
            json_response.headers.append("set-cookie", header_value)
    return json_response

@router.post("/logout")
async def logout(request: Request, response: Response):
    config = get_config()
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(
            f"{config.orchestrator_url}/auth/logout",
            cookies=request.cookies,
        )
    response.delete_cookie("access_token")
    return resp.json()


@router.get("/verify")
async def verify(request: Request):
    config = get_config()
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(
            f"{config.orchestrator_url}/auth/verify",
            cookies=request.cookies,
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.json())
    return resp.json()
