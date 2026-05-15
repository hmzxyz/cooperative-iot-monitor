# Stale Backend Tests

These backend tests were archived instead of deleted permanently.

They no longer match the current backend runtime:

- Old imports do not match the current backend routers. For example, the tests import `app.routers.prediction_service`, but the current backend has `backend/app/routers/predict.py`.
- Old synchronous SQLite assumptions do not match the async PostgreSQL-first backend. The tests configure `sqlite:///...`, call `init_db()` synchronously, and use sync session methods such as `query()`, `commit()`, and `close()` against the current async session setup.
- Several tests call router functions directly with sync dependencies, while the current FastAPI handlers are async and depend on `AsyncSession`.

These tests should be rewritten after the runtime alignment is complete, especially after the canonical telemetry path is finalized:

```text
Node-RED -> Mosquitto MQTT -> FastAPI -> PostgreSQL -> React
```
