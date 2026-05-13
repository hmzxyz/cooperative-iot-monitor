#!/bin/sh
set -e

echo "==> [1/3] Running Alembic migrations..."
alembic upgrade head
echo "    Migrations OK."

echo "==> [2/3] Seeding database..."
python -m app.seed
echo "    Seed OK."

echo "==> [3/3] Starting Uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
