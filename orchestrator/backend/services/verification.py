import hashlib
import httpx
from datetime import datetime, timezone

from backend.models.panel import PanelRegistration
from backend.schemas.panel import PanelManifest


class VerificationError(Exception):
    pass


async def verify_panel(manifest: PanelManifest) -> None:
    """
    Ping the service health endpoint and verify the frontend checksum.
    Raises VerificationError on any failure.
    """
    health_url = manifest.service_url.rstrip("/") + manifest.health_endpoint
    frontend_url = manifest.service_url.rstrip("/") + manifest.frontend_endpoint

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Health check
        try:
            resp = await client.get(health_url)
            if resp.status_code != 200:
                raise VerificationError(
                    f"Health endpoint {health_url} returned {resp.status_code}"
                )
        except httpx.RequestError as e:
            raise VerificationError(f"Health endpoint unreachable: {e}") from e

        # Fetch frontend and verify checksum
        try:
            resp = await client.get(frontend_url)
            if resp.status_code != 200:
                raise VerificationError(
                    f"Frontend endpoint {frontend_url} returned {resp.status_code}"
                )
        except httpx.RequestError as e:
            raise VerificationError(f"Frontend endpoint unreachable: {e}") from e

        content = resp.content
        actual_hash = "sha256:" + hashlib.sha256(content).hexdigest()
        expected_hash = manifest.frontend_checksum

        if actual_hash != expected_hash:
            raise VerificationError(
                f"Frontend checksum mismatch. "
                f"Expected {expected_hash}, got {actual_hash}"
            )


def mark_verified(panel: PanelRegistration) -> None:
    panel.verified = True
    panel.last_verified_at = datetime.now(timezone.utc)
