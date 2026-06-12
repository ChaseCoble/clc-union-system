import httpx
from backend.config import get_config


async def get_verified_panels(cookie: str = "", role: str = "owner") -> list[dict]:
    config = get_config()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{config.orchestrator_url}/panels/verified",
                params={"role": role},
                headers={"Cookie": f"access_token={cookie}"},
            )
            if resp.status_code == 200:
                return resp.json()
            return []
    except httpx.RequestError:
        return []


async def orchestrator_reachable() -> bool:
    config = get_config()
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{config.orchestrator_url}/health")
            return resp.status_code == 200
    except httpx.RequestError:
        return False
