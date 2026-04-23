# Sprint 4 – Tunisian Accounting & Dividend Engine

## Goal
Implement chart of accounts, automatic journal entries, bank reconciliation, and member dividend calculation.

## Duration
~4 weeks (weeks 15‑18 of the project).

## Key Deliverables
- **Backend**
  - Chart of accounts table (official Tunisian codes: 4110 Clients, 7010 Sales, etc.).
  - Journal entry model with double‑entry constraint (sum debit = sum credit).
  - Auto‑posting rules (Invoice creation → sales entry).
  - Bank reconciliation UI (match statement lines to journal entries).
  - Member shares table (member_id, shares_quantity, join_date).
  - Dividend calculation engine (40% of net profit × member_shares/total_shares).
  - Dividend PDF statements per member.
  - Auto‑post dividend distribution entry (debit Retained earnings, credit Dividends payable).
- **Frontend**
  - Bank reconciliation page (manual matching, mark cleared).
  - Dividend statements view.

## Important Files
- `backend/app/models/account.py` – Chart of accounts.
- `backend/app/models/journal_entry.py` – Double‑entry logic.
- `backend/app/api/statements.py` – Bank reconciliation API.
- `backend/app/api/dividends.py` – Dividend engine.

## Testing
- **Backend** – pytest for double‑entry validation, dividend math.
- **Frontend** – Manual reconciliation of sample bank statement.
- **End‑to‑end** – Create invoice → pay → month‑end closing → financial statements.

## Risks & Mitigations
- Tunisian accounting rules – involve local accountant for validation.
- Year‑end closing – prevent modifications after closing; implement closed period flag.

---
*This sprint completes the financial backbone; depends on Sprint 3's invoicing.*