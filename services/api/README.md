# services/api — Claro Backend (FastAPI)

**Intentionally empty during the frontend phase.** Built later against `../../docs/billing_rules.md` and `../../docs/PRD.md` (data model §5).

Planned layout (built in the backend phase):
```
app/
  main.py          # FastAPI app, CORS, router registration
  config.py        # pydantic-settings (.env)
  database.py      # Supabase / SQLAlchemy session
  deps.py          # get_db, get_current_business
  models/          # ORM: user, business, inventory, customer, staff, bill, khata
  schemas/         # Pydantic request/response
  routers/         # auth, onboarding, billing, khata, inventory, staff, analytics
  services/        # billing (confirm_bill per billing_rules.md), invoice_pdf, upi, whatsapp
  core/security.py
tests/             # test_billing.py, test_khata.py
requirements.txt
.env.example
```

Do not build until the frontend is verified and the backend logic is finalized.
