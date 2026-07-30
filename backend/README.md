# Backend — ClinicPulse

FastAPI backend for the Clinic EOD Billing & Analytics Agent.

## Structure

```
app/
  routers/    # REST endpoints (billing)
  services/   # business logic (reconciliation, analytics, narrative, processor)
  models/     # Pydantic models + validators
  schemas/    # response schemas
  utils/      # money formatting
  main.py     # FastAPI app entry point
tests/
data/         # sample billing logs
requirements.txt
```

## Running

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs at `http://localhost:8000/docs`.

## Tests

```bash
pytest tests -q
```
