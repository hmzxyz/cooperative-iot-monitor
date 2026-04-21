# Sprint 2 – Offline‑First Mobile App (Milk Collection)

## Goal
Create a React Native app that records milk collections offline, captures GPS, and syncs to the backend when online.

## Duration
~5 weeks (weeks 6‑10 of the project).

## Key Deliverables
- **Mobile App** (`mobile/` repo)
  - Realm DB schema for `collections` (farmer_id, weight_gross, foam_deduction, gps, timestamp, sync_id).
  - GPS capture on form submit (react-native-geolocation-service).
  - Foam deduction logic (5% weight if foam detected, requires manager override).
  - Background sync when network resumes (react-native-netinfo).
- **Backend**
  - New `MilkCollection` model (SQLAlchemy) with foam deduction field.
  - API endpoint (`/api/collections`) for mobile sync.
  - Conflict resolution: `last_write_wins` + `sync_id` uniqueness.
- **Frontend**
  - Updated dashboard to show mobile-collected data.
  - Admin interface for reviewing pending mobile collections.

## Important Files
- `mobile/src/db/realm.ts` – Realm schema.
- `mobile/src/screens/CollectionForm.tsx` – GPS capture + foam logic.
- `backend/app/models/milk_collection.py` – SQLAlchemy model.
- `backend/app/api/collections.py` – FastAPI router.

## Testing
- **Mobile** – Detox for offline/online transition.
- **Backend** – pytest with test DB.
- **Integration** – Airplane mode → record → disable → verify DB.

## Risks & Mitigations
- Conflict resolution – `last_write_wins` + sync_id.
- Large offline queue – limit pending records to 1000, warn user to sync.

---
*This sprint depends on Sprint 1's real sensor data being available.*