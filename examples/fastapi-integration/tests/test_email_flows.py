from __future__ import annotations

import sys
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import main


class FakeMailGoat:
    def __init__(self) -> None:
        self.sent: list[dict] = []

    async def send(self, to: str, subject: str, body: str, **kwargs):
        msg = {"kind": "send", "to": to, "subject": subject, "body": body, **kwargs}
        self.sent.append(msg)
        return {"id": f"msg-{len(self.sent)}"}

    async def send_template(self, to: str, template: str, data: dict, subject: str, **kwargs):
        msg = {
            "kind": "template",
            "to": to,
            "template": template,
            "subject": subject,
            "data": data,
            **kwargs,
        }
        self.sent.append(msg)
        return {"id": f"msg-{len(self.sent)}"}

    async def aclose(self):
        return None


@pytest.fixture(autouse=True)
def clear_state():
    main.USERS.clear()
    main.RESET_TOKENS.clear()
    main.ORDERS.clear()
    main.INBOUND_MESSAGES.clear()


@pytest.fixture
def fake_mailgoat() -> FakeMailGoat:
    fake = FakeMailGoat()
    main.app.state.mailgoat = fake
    return fake


@pytest.mark.asyncio
async def test_user_registration_sends_welcome_email(fake_mailgoat: FakeMailGoat):
    transport = ASGITransport(app=main.app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/register",
            json={"name": "Ava", "email": "ava@example.com", "password": "StrongPass123"},
        )

    assert response.status_code == 201
    assert len(fake_mailgoat.sent) == 1
    sent = fake_mailgoat.sent[0]
    assert sent["template"] == "welcome.html"
    assert sent["to"] == "ava@example.com"


@pytest.mark.asyncio
async def test_password_reset_flow(fake_mailgoat: FakeMailGoat):
    main.USERS["ava@example.com"] = {
        "name": "Ava",
        "email": "ava@example.com",
        "password": "old-password",
        "is_verified": True,
    }

    transport = ASGITransport(app=main.app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        req = await client.post("/api/password-reset/request", json={"email": "ava@example.com"})
        assert req.status_code == 200

        token = next(iter(main.RESET_TOKENS.keys()))
        confirm = await client.post(
            "/api/password-reset/confirm",
            json={"token": token, "new_password": "new-password-123"},
        )

    assert confirm.status_code == 200
    assert main.USERS["ava@example.com"]["password"] == "new-password-123"
    assert len(fake_mailgoat.sent) == 1
    assert fake_mailgoat.sent[0]["template"] == "reset-password.html"


@pytest.mark.asyncio
async def test_transactional_emails_order_and_shipping(fake_mailgoat: FakeMailGoat):
    transport = ASGITransport(app=main.app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        order = await client.post(
            "/api/orders",
            json={"user_email": "buyer@example.com", "order_id": "ord-100", "total_cents": 2599},
        )
        assert order.status_code == 200

        shipping = await client.post(
            "/api/orders/ord-100/shipping",
            json={
                "user_email": "buyer@example.com",
                "order_id": "ord-100",
                "tracking_number": "TRACK123",
                "carrier": "UPS",
            },
        )

    assert shipping.status_code == 200
    subjects = [m["subject"] for m in fake_mailgoat.sent]
    assert "Order ord-100 confirmation" in subjects
    assert "Receipt for order ord-100" in subjects
    assert "Order ord-100 shipped" in subjects


@pytest.mark.asyncio
async def test_webhook_receiver_routes_message(fake_mailgoat: FakeMailGoat):
    main.ORDERS["ord-200"] = {
        "id": "ord-200",
        "user_email": "buyer@example.com",
        "status": "shipped",
        "total_cents": 3000,
    }

    transport = ASGITransport(app=main.app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/webhooks/mailgoat",
            json={
                "from_address": "buyer@example.com",
                "to_address": "support@example.com",
                "subject": "Question about ord-200",
                "body": "Where is my package?",
                "message_id": "inb-1",
            },
        )

    assert response.status_code == 200
    assert len(main.INBOUND_MESSAGES) == 1
    assert main.ORDERS["ord-200"]["status"] == "customer-replied"
