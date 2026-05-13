# Sprint 09: Technician Authentication System

> Canonical merged version for the PFE book: `designDocs/PFE_BOOK/09_technician_auth_merged.md`.

## Dates
- **Start:** 2026-05-01
- **Last update:** 2026-05-05

## Objective
Create a full‑stack authentication flow for factory technicians that includes:
1. **Sign‑in page** with optional face‑recognition hook (front‑end UI scaffold).
2. **Technician account management** (add/remove, role‑based view).
3. **Secure password‑recovery** using a configurable security question/answer.

## Scope & Implementation Summary
- **Backend** – extended `User` model (`role`, `security_question`, `security_answer_hash`, `phone`, `last_login`).
- Added new endpoints in `backend/app/routers/auth.py`:
  - `POST /api/auth/register` (role aware, stores security data).
  - `POST /api/auth/login` (returns JWT with `role`).
  - `POST /api/auth/password-reset` (validates security answer before updating password).
  - `GET /api/auth/me` (current user info).
  - `GET /api/auth/technicians` & `DELETE /api/auth/technicians/{id}` (admin‑only technician list & removal).
- **Frontend** – placeholder `LoginPage.jsx` now consumes the new `/register` and `/login` endpoints, displays role after login, and shows a “Forgot password?” flow that posts to `/password-reset`.
- **Database migration** – `alembic` revision `add_role_field_to_users` adds the new columns to the `users` table (run `alembic upgrade head`).

## Detailed Tasks (in order of execution)
| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Add `role`, `security_question`, `security_answer_hash`, `phone`, `last_login` columns to `User` model (`backend/app/models/user.py`). | Claude | ✅ Completed |
| 2 | Create Alembic revision `add_role_field_to_users` and upgrade DB. | Claude | ✅ Completed |
| 3 | Implement registration, login, password‑reset, admin‑only technician list/delete endpoints (`backend/app/routers/auth.py`). | Claude | ✅ Completed |
| 4 | Extend `frontend/src/pages/LoginPage.jsx` with technician UI and password‑reset form. | Claude | ✅ Completed |
| 5 | Add environment variable examples for front‑end (`frontend/.env.example`). | Claude | ✅ Completed |
| 6 | Write sprint documentation (this file). | Claude | ✅ Completed |

## How to Run the Project (end‑to‑end)
1. **Start the MQTT broker** (required for real‑time sensor data):
   ```bash
   mosquitto -c mosquitto.conf   # listens on 1883 (TCP) and 9001 (WebSocket)
   ```
2. **Backend** – ensure a fresh DB schema:
   ```bash
   cd backend
   # Install dependencies (uv is already in the repo)
   uv sync
   # Apply alembic migration (adds role & security fields)
   alembic upgrade head
   # Start FastAPI with auto‑reload
   uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
3. **Frontend** – configure API URLs (defaults work if backend is on localhost):
   ```bash
   cd frontend
   cp .env.example .env   # adjust VITE_API_BASE_URL if needed
   npm install
   npm run dev            # Vite serves at http://localhost:5173
   ```
4. **Simulator (optional – provides sensor traffic):**
   ```bash
   cd esp32-simulators
   npm install
   npm start              # publishes to mqtt://localhost:1883
   ```
5. **Test the technician flow:**
   - Open `http://localhost:5173`.
   - Use the **Register** form to create a technician (role defaults to `technician`).
   - Log in; you should see a JWT token in the network request and the UI will show the role.
   - Click **Forgot password?**, answer the security question, and set a new password.
   - As an admin (create an admin user manually in the DB or via `/register` with `role="admin"`), navigate to `GET /api/auth/technicians` to see the list and delete a technician via `DELETE /api/auth/technicians/{id}`.

## Verification Checklist
- [ ] Backend starts without migration errors.
- [ ] `POST /api/auth/register` creates a user with `role=technician`.
- [ ] `POST /api/auth/login` returns a JWT containing `role`.
- [ ] `POST /api/auth/password-reset` updates the password only after a correct security answer.
- [ ] Admin can list and delete technicians via the new endpoints.
- [ ] Front‑end login page reflects the role and shows the password‑reset UI.

## Next Steps (post‑sprint)
- Implement actual face‑recognition integration on the login page.
- Add unit tests for the new auth endpoints (`backend/tests/test_auth.py`).
- Harden the password‑reset flow (rate limiting, email token fallback).
- Wire the technician role into front‑end route guards.

---
*All file references are relative to the repository root.*
