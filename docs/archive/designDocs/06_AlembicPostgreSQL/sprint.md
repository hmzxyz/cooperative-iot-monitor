# Sprint 06: Alembic Migrations + PostgreSQL

## Objective

Replace the ad-hoc `create_all` schema initialization with proper Alembic migrations. Make PostgreSQL the production database (used in Docker), keeping SQLite for local dev without Docker.

---

## Status: DONE ✅

| Task | Status |
|------|--------|
| `alembic>=1.13.0` + `psycopg2-binary>=2.9.9` added to deps | ✅ |
| `backend/alembic.ini` — standard config, URL overridden by env.py | ✅ |
| `backend/alembic/env.py` — reads `DATABASE_URL`, imports all models | ✅ |
| `backend/alembic/script.py.mako` — migration file template | ✅ |
| `backend/alembic/versions/001_initial_schema.py` — creates both tables | ✅ |
| `backend/app/database.py` — `DATABASE_URL` from env, conditional `connect_args` | ✅ |
| `backend/app/main.py` — `init_db()` only runs for SQLite (Docker uses alembic) | ✅ |
| `docker-compose.yml` — postgres service + backend `DATABASE_URL` env var | ✅ |

---

## Architecture

### Database Strategy by Environment

| Environment | DB | Schema Init |
|-------------|-----|-------------|
| Local dev (no Docker) | SQLite `sensors.db` | `create_all` via `init_db()` in lifespan |
| Docker / production | PostgreSQL | `alembic upgrade head` in Dockerfile CMD |

### Migration Flow (Docker)

```
docker compose up
  └─ backend container starts
       └─ CMD: alembic upgrade head
            └─ connects to postgres:5432
            └─ runs 001_initial_schema.py → creates sensor_readings + users tables
            └─ stamps alembic_version = "001"
       └─ uvicorn app.main:app starts
            └─ lifespan: DATABASE_URL is postgres → skips init_db()
```

### Adding Future Migrations

```bash
cd backend
# Generate a new migration from model diff:
DATABASE_URL=postgresql://iot_user:iotpassword@localhost:5432/iot_monitor \
  alembic revision --autogenerate -m "add column X"

# Apply locally:
DATABASE_URL=... alembic upgrade head

# Roll back one step:
DATABASE_URL=... alembic downgrade -1
```

### Initial Schema (revision 001)

**`sensor_readings`**
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| device_id | String | indexed |
| sensor_id | String | indexed |
| payload | JSON | `{"value": float}` |
| timestamp | DateTime | UTC |

**`users`**
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| username | String | unique, indexed |
| hashed_password | String | bcrypt |
| created_at | DateTime | UTC |

---

## File Changes

```
backend/
  pyproject.toml               + alembic, psycopg2-binary
  requirements.txt             + alembic, psycopg2-binary
  alembic.ini                  NEW — Alembic config (URL set via env.py)
  alembic/
    env.py                     NEW — reads DATABASE_URL, imports models
    script.py.mako             NEW — migration file template
    versions/
      001_initial_schema.py    NEW — creates sensor_readings + users
  app/
    database.py                UPDATED — DATABASE_URL from env, conditional connect_args
    main.py                    UPDATED — init_db() skipped when using PostgreSQL
```

---

## Local Dev (without Docker)

No change needed — SQLite still works out of the box:

```bash
cd backend
uv sync          # installs alembic + psycopg2-binary now included
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# sensors.db created automatically via init_db() / create_all
```

To run Alembic against a local PostgreSQL instead:
```bash
export DATABASE_URL=postgresql://iot_user:iotpassword@localhost:5432/iot_monitor
alembic upgrade head
uvicorn app.main:app --reload
```

---

## TODO — Next Sprints

- [x] **Sprint 01** — ESP32 Simulator (basic)
- [x] **Sprint 02** — Auth (JWT login, protected routes)
- [x] **Sprint 03** — Historical charts
- [x] **Sprint 04** — Multi-device simulator
- [x] **Sprint 05** — Docker Compose
- [x] **Sprint 06** — Alembic migrations, PostgreSQL ← **current**
- [ ] **Sprint 07** — Testing (pytest + coverage, frontend unit tests)
- [ ] **Sprint 08** — CI/CD (GitHub Actions: lint, test, build, push image)
