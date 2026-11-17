# Anklyze frontend

React 19, TypeScript and Vite. See the [root README](../README.md) for what the project is and how to run the whole stack.

```bash
npm install
npm run dev        # http://localhost:5173
npm run lint
npx tsc --noEmit
npm run test:run   # Vitest, single run
npm run build
```

Copy `.env.example` to `.env.local`. `VITE_API_URL` defaults to `http://localhost:8080`. Without `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, authentication is disabled.

User-facing strings live in `src/i18n/en.json` and `src/i18n/es.json`.
