# Sprint 09 (Merged): Technician Authentication for MES

## Dates

- Start: 2026-05-01
- Last merged update: 2026-05-03

## Objective

Deliver technician-focused access to the MES dashboard:
- Sign in with persistent technician accounts
- Sign up flow for technician onboarding
- Forgot-password recovery with security question/answer

## Why This Sprint

The previous auth flow was generic and not practical for in-factory operators. Accounts needed to be reusable across shifts with a recoverable password process.

## Final Implemented Scope

### Backend

- Extended `users` auth schema usage with:
  - `role`
  - `security_question`
  - `security_answer_hash`
  - `phone`
  - `last_login`
- Implemented auth endpoints:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/password-reset/question?username=...`
  - `POST /api/auth/password-reset`
  - `GET /api/auth/me`
  - `GET /api/auth/technicians`
  - `DELETE /api/auth/technicians/{id}`
- Added stronger auth validation:
  - duplicate username rejection (including case-insensitive check)
  - weak password rejection

### Frontend

- Reworked login screen into 3 modes:
  - Sign In
  - Sign Up
  - Forgot Password
- Wired auth methods in context:
  - `registerTechnician(...)`
  - `getPasswordResetQuestion(username)`
  - `resetPassword(...)`
- Added success/error states for signup and reset.

### Data/Migrations

- Added Alembic revision `002` for technician auth columns.
- Hardened migration bootstrap for legacy local SQLite DBs.

## Verification

- Backend tests: `7 passed` (`backend/tests/test_api_smoke.py`)
- Frontend production build: successful (`npm run build`)
- Backend startup: confirmed API starts even if MQTT is unavailable.

## Delivered vs Carry-Over

### Delivered

- Technician sign-in/signup in web app
- Password recovery by security question
- Persistent account storage in DB
- Backend validation and tests for weak passwords and duplicate usernames

### Carry-Over

- Dedicated admin-only endpoint `POST /api/auth/technicians`
- Token-based reset flow (TTL + single-use token table)
- Final screenshot set for PFE chapter figures

## Evidence Files

- Backend auth: `backend/app/routers/auth.py`
- Frontend auth page: `frontend/src/pages/LoginPage.jsx`
- Auth context wiring: `frontend/src/AuthContext.jsx`
- Tests: `backend/tests/test_api_smoke.py`
- Migration: `backend/alembic/versions/002_add_technician_auth_columns.py`
