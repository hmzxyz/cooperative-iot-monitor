import os
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText
from email.utils import formataddr
import smtplib
import ssl
import secrets
import threading

from sqlalchemy.orm import Session

from app.database import get_db


# ── In‑memory OTP store (swap for Redis / DB table in production) ──────────
_otp_store: dict[str, dict] = {}
_otp_lock = threading.Lock()


def _generate_otp(length: int = 6) -> str:
    """Return a random numeric OTP string."""
    return "".join(secrets.choice("0123456789") for _ in range(length))


def _save_otp(email: str, code: str, ttl_minutes: int = 10) -> None:
    with _otp_lock:
        _otp_store[email] = {
            "code": code,
            "expires": datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes),
        }


def _verify_otp(email: str, code: str) -> bool:
    with _otp_lock:
        entry = _otp_store.get(email)
        if not entry:
            return False
        if datetime.now(timezone.utc) > entry["expires"]:
            del _otp_store[email]
            return False
        if secrets.compare_digest(entry["code"], code):
            del _otp_store[email]
            return True
        return False


def _clear_otp(email: str) -> None:
    with _otp_lock:
        _otp_store.pop(email, None)


# ── Email sending ─────────────────────────────────────────────────────────
def send_email_sync(to_addr: str, subject: str, body_text: str) -> None:
    """
    Send a plain-text email synchronously using SMTP env vars.
    """
    host = os.getenv("SMTP_HOST", "localhost")
    port = int(os.getenv("SMTP_PORT", "1025"))
    user = os.getenv("SMTP_USER", "")
    password = os.getenv("SMTP_PASSWORD", "")
    use_tls = os.getenv("SMTP_TLS", "false").lower() == "true"
    sender_name = os.getenv("SMTP_SENDER_NAME", "CoopIoT Monitor")
    sender_addr = os.getenv("SMTP_SENDER_ADDR", user)

    msg = MIMEText(body_text, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = formataddr((sender_name, sender_addr))
    msg["To"] = formataddr(("", to_addr))

    context = ssl.create_default_context()

    with smtplib.SMTP(host, port, timeout=15) as server:
        if use_tls:
            server.starttls(context=context)
        if user and password:
            server.login(user, password)
        server.sendmail(sender_addr, [to_addr], msg.as_string())


# ── Public helpers exported to routers ────────────────────────────────────
def generate_and_store_otp(email: str) -> str:
    code = _generate_otp(6)
    _save_otp(email, code)
    return code


def validate_otp(email: str, code: str) -> bool:
    return _verify_otp(email, code)


def clear_otp(email: str) -> None:
    _clear_otp(email)