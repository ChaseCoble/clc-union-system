import httpx
from backend.config import get_config


async def get_verified_panels(role: str = "owner") -> list[dict]:
    config = get_config()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{config.orchestrator_url}/panels/verified",
                params={"role": role},
            )
            if resp.status_code == 200:
                panels = resp.json()
                return [p for p in panels if p.get("required_role") == role or p.get("required_role") == "owner"]
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
