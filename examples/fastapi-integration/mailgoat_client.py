from __future__ import annotations

from pathlib import Path
from typing import Any

import httpx
from jinja2 import Environment, FileSystemLoader, select_autoescape


class AsyncMailGoat:
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.mailgoat.ai/v1",
        timeout: float = 10.0,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.client = httpx.AsyncClient(timeout=timeout)

        template_dir = Path(__file__).parent / "templates"
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(template_dir)),
            autoescape=select_autoescape(["html", "xml"]),
        )

    async def send(self, to: str, subject: str, body: str, **kwargs: Any) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "to": to,
            "subject": subject,
            "body": body,
        }
        payload.update(kwargs)

        response = await self.client.post(
            f"{self.base_url}/send",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json=payload,
        )
        response.raise_for_status()
        return response.json()

    async def send_template(
        self,
        to: str,
        template: str,
        data: dict[str, Any],
        subject: str,
        **kwargs: Any,
    ) -> dict[str, Any]:
        html_body = self.jinja_env.get_template(template).render(**data)
        return await self.send(to=to, subject=subject, body=html_body, html=True, **kwargs)

    async def aclose(self) -> None:
        await self.client.aclose()
