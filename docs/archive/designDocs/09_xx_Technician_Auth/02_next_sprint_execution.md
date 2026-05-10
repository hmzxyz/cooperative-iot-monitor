# Sprint 09: Execution Checklist

## Day 1: Backend Foundation

- [ ] Add Alembic migration for technician/account-recovery schema.
- [x] Extend auth model/service for technician role and recovery fields.
- [ ] Add endpoint: `POST /api/auth/technicians` (admin-only create).

## Day 2: Recovery Flow

- [x] Add endpoint: `GET /api/auth/password-reset/question`.
- [x] Add endpoint: `POST /api/auth/password-reset`.
- [ ] Implement token-based reset hashing, TTL, single-use enforcement (hardening track).

## Day 3: Frontend Auth UX

- [x] Update login page copy for in-factory technicians.
- [x] Add forgot-password request form.
- [x] Add reset-password form (security answer + new password).
- [x] Wire new auth methods in `AuthContext`.

## Day 4: Validation + Tests

- [x] Add backend tests: technician creation, login, forgot/reset flow.
- [ ] Verify invalid token, expired token, and reused token scenarios (pending token-based flow).
- [x] Confirm existing auth + sensor routes still pass smoke tests.

## Day 5: Sprint Closure

- [x] Update sprint report with current API contracts.
- [x] Document account onboarding and password reset operational steps.
- [ ] List carry-over items for Sprint 10.
