# Sprint 09: Technician Sign-In + Account Recovery

> Canonical merged version for the PFE book: `designDocs/PFE_BOOK/09_technician_auth_merged.md`.

## Date

2026-05-01

## Objective

Create a dedicated sign-in flow for in-factory technicians, persist technician accounts in the database, and add a practical forgot-password/reset process.

---

## Status: IN PROGRESS 🔄 (Updated 2026-05-03)

## Problem Statement

- Earlier auth was generic and did not provide a technician-centered UX.
- Recovery was not wired in the frontend and was hard to use for operators.
- In-factory operators need stable accounts they can reuse across shifts.

---

## Scope

1. Technician sign-in/sign-up page in frontend.
2. Technician account persistence and lifecycle in backend DB.
3. Forgot-password flow using security question + answer (current implementation path).
4. Basic admin-controlled technician onboarding (carry-over).

---

## Backend Changes (Current)

### Data Model in Use

`users` table supports factory users with:
- `role` (default `technician`)
- `security_question`
- `security_answer_hash`
- `phone`
- `last_login`

### Implemented API Endpoints

- `POST /api/auth/register`: create account (technician default).
- `POST /api/auth/login`: authenticate and return JWT.
- `GET /api/auth/password-reset/question?username=...`: fetch stored security question.
- `POST /api/auth/password-reset`: verify security answer and update password.
- `GET /api/auth/technicians`, `DELETE /api/auth/technicians/{id}`: admin technician management.

### Security Rules Implemented

- Passwords and security answers are stored as hashes.
- Password reset requires username + matching hashed security answer.
- Input validation added for required fields and lengths.

---

## Frontend Changes Implemented

- Technician-focused auth page with 3 modes:
  - Sign In
  - Sign Up
  - Forgot Password
- Added forgot-password flow:
  - Load security question by username.
  - Submit security answer + new password.
- Extended auth context with:
  - `registerTechnician(...)`
  - `getPasswordResetQuestion(username)`
  - `resetPassword(...)`

---

## Database Notes

- SQLite dev DB persists technician accounts via existing `users` table columns.
- Token-table migration (`password_resets`) remains deferred to a future hardening sprint.

---

## Definition of Done

- [x] Technician can sign in from frontend with persisted DB account.
- [ ] Admin can create technician accounts via dedicated admin-only create endpoint.
- [x] Forgot-password request and reset endpoints functional (security question flow).
- [ ] Reset token is hashed, expiring, and single-use (deferred approach).
- [x] Frontend has clear error states for signup/reset failures.
- [x] Backend tests cover technician login and password reset flow.
- [x] Sprint report updated with current endpoint list.

---

## Out of Scope (This Sprint)

- Email/SMS gateway integration for reset delivery.
- Multi-factor authentication.
- Fine-grained RBAC beyond basic role checks.
