from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Request, status

from mailgoat_client import AsyncMailGoat
from models import (
    InboundWebhookPayload,
    OrderCreate,
    PasswordResetConfirm,
    PasswordResetRequest,
    ShippingUpdate,
    UserCreate,
)

app = FastAPI(title="MailGoat FastAPI Integration Example")

USERS: dict[str, dict[str, Any]] = {}
RESET_TOKENS: dict[str, dict[str, Any]] = {}
ORDERS: dict[str, dict[str, Any]] = {}
INBOUND_MESSAGES: list[dict[str, Any]] = []


@app.on_event("startup")
async def startup() -> None:
    api_key = os.getenv("MAILGOAT_API_KEY", "demo-key")
    base_url = os.getenv("MAILGOAT_BASE_URL", "https://api.mailgoat.ai/v1")
    app.state.mailgoat = AsyncMailGoat(api_key=api_key, base_url=base_url)


@app.on_event("shutdown")
async def shutdown() -> None:
    mailgoat: AsyncMailGoat = app.state.mailgoat
    await mailgoat.aclose()


def get_mailgoat_client() -> AsyncMailGoat:
    return app.state.mailgoat


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


@app.post("/api/register", status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate, mailgoat: AsyncMailGoat = Depends(get_mailgoat_client)) -> dict[str, Any]:
    if user.email in USERS:
        raise HTTPException(status_code=409, detail="User already exists")

    verification_token = secrets.token_urlsafe(24)
    USERS[user.email] = {
        "name": user.name,
        "email": user.email,
        "password": user.password,
        "is_verified": False,
        "verification_token": verification_token,
        "created_at": _now_utc().isoformat(),
    }

    verification_link = f"https://example.local/verify?token={verification_token}"
    await mailgoat.send_template(
        to=user.email,
        template="welcome.html",
        subject="Welcome to MailGoat FastAPI",
        data={"name": user.name, "verification_link": verification_link},
    )

    return {"message": "Check your email for a verification link", "email": user.email}


@app.post("/api/password-reset/request")
async def request_password_reset(
    payload: PasswordResetRequest,
    mailgoat: AsyncMailGoat = Depends(get_mailgoat_client),
) -> dict[str, str]:
    user = USERS.get(payload.email)
    if not user:
        # Avoid user enumeration leaks.
        return {"message": "If that account exists, a reset email was sent"}

    token = secrets.token_urlsafe(32)
    RESET_TOKENS[token] = {
        "email": payload.email,
        "expires_at": (_now_utc() + timedelta(minutes=30)).isoformat(),
        "used": False,
    }

    reset_link = f"https://example.local/reset-password?token={token}"
    await mailgoat.send_template(
        to=payload.email,
        template="reset-password.html",
        subject="Reset your password",
        data={"name": user["name"], "reset_link": reset_link, "expires_minutes": 30},
    )

    return {"message": "If that account exists, a reset email was sent"}


@app.post("/api/password-reset/confirm")
async def confirm_password_reset(payload: PasswordResetConfirm) -> dict[str, str]:
    token_record = RESET_TOKENS.get(payload.token)
    if not token_record:
        raise HTTPException(status_code=404, detail="Reset token not found")

    if token_record["used"]:
        raise HTTPException(status_code=409, detail="Reset token already used")

    if _now_utc() > datetime.fromisoformat(token_record["expires_at"]):
        raise HTTPException(status_code=410, detail="Reset token expired")

    email = token_record["email"]
    if email not in USERS:
        raise HTTPException(status_code=404, detail="User not found")

    USERS[email]["password"] = payload.new_password
    token_record["used"] = True

    return {"message": "Password updated"}


@app.post("/api/orders")
async def create_order(order: OrderCreate, mailgoat: AsyncMailGoat = Depends(get_mailgoat_client)) -> dict[str, Any]:
    if order.order_id in ORDERS:
        raise HTTPException(status_code=409, detail="Order already exists")

    ORDERS[order.order_id] = {
        "id": order.order_id,
        "user_email": order.user_email,
        "status": "confirmed",
        "total_cents": order.total_cents,
        "created_at": _now_utc().isoformat(),
    }

    total = f"${order.total_cents / 100:.2f}"

    await mailgoat.send(
        to=order.user_email,
        subject=f"Order {order.order_id} confirmation",
        body=(
            f"Thanks for your order!\\n"
            f"Order ID: {order.order_id}\\n"
            f"Total: {total}\\n"
            "A receipt is attached to your account dashboard."
        ),
        tag="order-confirmation",
    )

    await mailgoat.send(
        to=order.user_email,
        subject=f"Receipt for order {order.order_id}",
        body=f"Receipt generated for {order.order_id}. Charged amount: {total}.",
        tag="receipt",
    )

    return {"message": "Order created", "order_id": order.order_id}


@app.post("/api/orders/{order_id}/shipping")
async def shipping_update(
    order_id: str,
    payload: ShippingUpdate,
    mailgoat: AsyncMailGoat = Depends(get_mailgoat_client),
) -> dict[str, Any]:
    if order_id not in ORDERS:
        raise HTTPException(status_code=404, detail="Order not found")

    if order_id != payload.order_id:
        raise HTTPException(status_code=400, detail="Route order_id must match body order_id")

    ORDERS[order_id]["status"] = "shipped"
    ORDERS[order_id]["tracking_number"] = payload.tracking_number
    ORDERS[order_id]["carrier"] = payload.carrier

    await mailgoat.send(
        to=payload.user_email,
        subject=f"Order {order_id} shipped",
        body=(
            f"Your order is on the way.\\n"
            f"Carrier: {payload.carrier}\\n"
            f"Tracking: {payload.tracking_number}"
        ),
        tag="shipping",
    )

    return {"message": "Shipping notification sent", "order_id": order_id}


@app.post("/webhooks/mailgoat")
async def mailgoat_webhook(payload: InboundWebhookPayload, request: Request) -> dict[str, str]:
    # Real systems should verify webhook signature here.
    INBOUND_MESSAGES.append(
        {
            "from": payload.from_address,
            "to": payload.to_address,
            "subject": payload.subject,
            "body": payload.body,
            "message_id": payload.message_id,
            "received_at": payload.received_at.isoformat() if payload.received_at else _now_utc().isoformat(),
            "source_ip": request.client.host if request.client else "unknown",
        }
    )

    # Example routing: mark order as customer-replied.
    for order in ORDERS.values():
        if order["id"] in payload.subject:
            order["status"] = "customer-replied"

    return {"message": "Webhook processed"}


@app.get("/api/debug/state")
async def debug_state() -> dict[str, Any]:
    # Debug route for example/tests only.
    return {
        "users": USERS,
        "orders": ORDERS,
        "reset_tokens": RESET_TOKENS,
        "inbound_messages": INBOUND_MESSAGES,
    }
