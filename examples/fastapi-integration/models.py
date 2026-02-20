from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str = Field(min_length=12)
    new_password: str = Field(min_length=8, max_length=200)


class OrderCreate(BaseModel):
    user_email: EmailStr
    order_id: str = Field(min_length=3, max_length=64)
    total_cents: int = Field(gt=0)


class ShippingUpdate(BaseModel):
    user_email: EmailStr
    order_id: str
    tracking_number: str = Field(min_length=4, max_length=128)
    carrier: str = Field(min_length=2, max_length=64)


class InboundWebhookPayload(BaseModel):
    from_address: EmailStr
    to_address: EmailStr
    subject: str
    body: str
    message_id: str
    received_at: Optional[datetime] = None
