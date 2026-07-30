# Frontend — ClinicPulse

React + Vite frontend for the Clinic EOD Billing & Analytics Agent.

## Structure

```
src/
  assets/       # static assets
  components/   # reusable UI components (Sidebar, StatCard, Card, UploadZone, PageHeader)
  context/      # AppContext — global state for the uploaded billing result
  hooks/        # custom hooks (useIsProcessing)
  pages/        # Dashboard, Analytics, Summary
  services/     # api.js + analyticsEngine.js (deterministic client-side engine)
  utils/        # money.js — paise formatting
  App.jsx
  main.jsx
  index.css
```

## Running

```bash
npm install
npm run dev
```

The app runs on Vite's dev server (default `http://localhost:5173`).
It works with or without the FastAPI backend — if the server is unreachable,
it falls back to the deterministic client-side analytics engine.

## Pages

- **Dashboard** — upload area, summary cards, payment breakdown table, operational stats, validation errors.
- **Analytics** — revenue-by-hour bar chart (peak highlighted), top medicines by quantity & revenue.
- **AI Summary** — WhatsApp-style narrative, recommendations, and a traceability panel.
