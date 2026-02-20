# FastAPI + MailGoat Integration Example

Complete FastAPI example for async email flows with MailGoat.

## What this demonstrates

- User registration flow with welcome + verification email
- Password reset request/confirm flow
- Transactional emails:
  - Order confirmation
  - Shipping notification
  - Receipt email
- MailGoat webhook receiver for inbound routing
- Async MailGoat client with template rendering
- Pytest coverage for core flows

## Project structure

```text
examples/fastapi-integration/
├── README.md
├── requirements.txt
├── main.py
├── mailgoat_client.py
├── models.py
├── templates/
│   ├── welcome.html
│   └── reset-password.html
└── tests/
    └── test_email_flows.py
```

## Quick start

```bash
cd examples/fastapi-integration
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

export MAILGOAT_API_KEY="your-api-key"
export MAILGOAT_BASE_URL="https://api.mailgoat.ai/v1"

uvicorn main:app --reload --port 8000
```

## Example API usage

Register user:

```bash
curl -X POST http://127.0.0.1:8000/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ava","email":"ava@example.com","password":"StrongPass123"}'
```

Password reset request:

```bash
curl -X POST http://127.0.0.1:8000/api/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{"email":"ava@example.com"}'
```

Create order + send transactional emails:

```bash
curl -X POST http://127.0.0.1:8000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"user_email":"buyer@example.com","order_id":"ord-100","total_cents":2599}'
```

Webhook receiver:

```bash
curl -X POST http://127.0.0.1:8000/webhooks/mailgoat \
  -H "Content-Type: application/json" \
  -d '{
    "from_address": "buyer@example.com",
    "to_address": "support@example.com",
    "subject": "Question about ord-100",
    "body": "Can you help?",
    "message_id": "inb-001"
  }'
```

## Testing

```bash
cd examples/fastapi-integration
pytest -q
```

## Notes

- This is an educational example with in-memory storage.
- For production, replace token/user/order stores with a database and add webhook signature validation.
