import httpx
from backend.config import get_config

async def orchestrator_reachable() -> bool:
    config = get_config()
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{config.orchestrator_url}/health")
            return resp.status_code == 200
    except httpx.RequestError:
        return False

async def validate_service(service_id:str, service_token:str) -> dict:
    config = get_config()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{config.orchestrator_url}/services/validate/{service_id}",
                headers={"x-service-token": service_token},
            )
            if resp.status_code == 200:
                return resp.json()
            return {"authenticated": False}
    except httpx.RequestError:
        return {"authenticated": False}
