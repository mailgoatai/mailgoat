#!/usr/bin/env python3
"""
Simple MailGoat agent.

Polls local MailGoat inbox cache every N seconds, reads new messages,
and sends automated responses via `mailgoat send`.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

POLL_SECONDS = int(os.getenv("POLL_SECONDS", "300"))
STATE_PATH = Path(os.getenv("STATE_FILE", str(Path.home() / ".mailgoat-simple-agent-state.json")))
REPLY_PREFIX = os.getenv("REPLY_PREFIX", "[Auto-Reply]")
FROM_HINT = os.getenv("MAILGOAT_FROM", "")


def run_mailgoat(args: list[str]) -> Any:
    """Run mailgoat command and parse JSON output."""
    cmd = ["mailgoat", *args, "--json"]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip() or "mailgoat command failed")
    out = proc.stdout.strip()
    return json.loads(out) if out else None


def load_state() -> set[str]:
    if not STATE_PATH.exists():
        return set()
    try:
        payload = json.loads(STATE_PATH.read_text(encoding="utf-8"))
        return set(payload.get("processed_ids", []))
    except Exception:
        return set()


def save_state(processed_ids: set[str]) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(
        json.dumps({"processed_ids": sorted(processed_ids)}, indent=2),
        encoding="utf-8",
    )


def build_reply_subject(original_subject: str) -> str:
    subject = original_subject.strip() if original_subject else "(no subject)"
    if subject.lower().startswith("re:"):
        return f"{REPLY_PREFIX} {subject}"
    return f"{REPLY_PREFIX} Re: {subject}"


def build_reply_body(sender: str, subject: str) -> str:
    lines = [
        f"Hello {sender or 'there'},",
        "",
        "Your email was received by the simple MailGoat agent.",
        "This is an automated acknowledgment while a human reviews your message.",
        "",
        f"Original subject: {subject or '(no subject)'}",
        "",
        "- MailGoat Simple Agent",
    ]
    return "\n".join(lines)


def process_messages() -> None:
    processed = load_state()

    inbox = run_mailgoat(["inbox", "list", "--limit", "50"])
    if not isinstance(inbox, list):
        print("Unexpected inbox payload, expected JSON array", file=sys.stderr)
        return

    for entry in inbox:
        msg_id = str(entry.get("id", "")).strip()
        if not msg_id or msg_id in processed:
            continue

        details = run_mailgoat(["read", msg_id])
        sender = str(details.get("from", "")).strip()
        subject = str(details.get("subject", "")).strip()

        if not sender:
            processed.add(msg_id)
            continue

        send_args = [
            "send",
            "--to",
            sender,
            "--subject",
            build_reply_subject(subject),
            "--body",
            build_reply_body(sender, subject),
        ]
        if FROM_HINT:
            send_args.extend(["--from", FROM_HINT])

        run_mailgoat(send_args)
        processed.add(msg_id)
        print(f"Replied to {sender} for message {msg_id}")

    save_state(processed)


def main() -> None:
    print(f"Simple agent started. Poll interval: {POLL_SECONDS}s")
    while True:
        try:
            process_messages()
        except Exception as exc:
            print(f"Agent iteration failed: {exc}", file=sys.stderr)
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
