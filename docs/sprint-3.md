# Sprint 3 – Commercial & Invoicing Module

## Goal
Add client management, pricing rules, transport fees, Tunisian VAT, and invoice generation.

## Duration
~4 weeks (weeks 11‑14 of the project).

## Key Deliverables
- **Backend**
  - Client & product_category tables (price per kg, VAT rate).
  - Transport fee calculator (distance_km × weight_kg × 0.15 TND).
  - Invoice model with status (paid/unpaid), lines, VAT, total.
  - Invoice API (`/api/invoices`, `/api/invoices/{id}/pay`).
  - PDF generation via WeasyPrint.
- **Frontend**
  - Invoice list page with filtering by client/date.
  - Invoice creation wizard (client → products → transport → VAT).
  - Payment button that updates status.
  - Client account statement generator.

## Important Files
- `backend/app/models/client.py` – SQLAlchemy model.
- `backend/app/models/invoice.py` – Invoice model & PDF logic.
- `backend/app/api/invoices.py` – FastAPI router.
- `frontend/src/pages/Invoices.tsx` – Invoice UI.

## Testing
- **Backend** – pytest for VAT calculation (7% food, 19% other).
- **Frontend** – Manual test of invoice creation flow.
- **PDF** – Visual inspection for correct TVA formatting.

## Risks & Mitigations
- Tunisian VAT rules – keep rate table editable; validate food vs. non-food.
- Invoice numbering – implement sequential per fiscal year (stored counter).

---
*This sprint builds on Sprint 2's client data and mobile collections.*