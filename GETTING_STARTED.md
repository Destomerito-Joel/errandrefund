# Getting Started — Reviewer Quickstart

The fastest way to run the demo is Docker Compose. You need Docker Desktop, Git, and a Gemini API key. The first image build usually takes a few minutes; network speed and Docker cache can make it longer.

## 1. Fastest path: Docker (recommended)

From a terminal, clone the project and enter its folder:

```sh
git clone <repository-url> therrandboy
cd therrandboy
```

Copy the environment template:

**PowerShell**
```powershell
Copy-Item .env.example .env
```

**macOS/Linux**
```sh
cp .env.example .env
```

Edit `.env`:

- Set `GEMINI_API_KEY` to your own Gemini API key.
- Set `ADMIN_API_KEY` to a unique value of at least 32 characters. You can generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
- Keep the provided local database settings for a normal demo. The Gemini models default to `gemini-3.8-flash` and `gemini-3.1-flash-lite`.
- Keep `.env` private; never commit or paste it into chat.

Build and start PostgreSQL, the Express API, and the frontend:

```sh
docker compose up --build
```

On first run, Docker downloads/builds the images, waits for PostgreSQL to become healthy, then the backend applies migrations and seeds the demo data. Look for a seed message reporting **15 customers, 42 orders, and 4 historical requests**, plus **“Refund API listening on port 4000”**. Wait for the frontend container to finish starting before opening the app. This commonly takes a few minutes on the first run.

Open:

- Customer chat: [http://localhost:3000](http://localhost:3000)
- Admin dashboard: [http://localhost:3000/admin](http://localhost:3000/admin)
- Backend + database health: [http://localhost:4000/api/health](http://localhost:4000/api/health) — expect JSON with `status` and `database` both `ok`.

Ports 3000, 4000, and 5432 must be free. Compose binds them to localhost. Stop the stack with `docker compose down`; demo data stays in the database volume.

## 2. Manual path: frontend and backend separately

This runs the same apps directly in terminals for hot reload. The frontend is **Nuxt 4 with Vue 3**; Nuxt serves the web UI, and you can start its development server with `npm run dev`. The backend is an **Express API**; start its development server with `npm run dev` from the backend folder.

### Prerequisites

- Node.js 20 for the backend and Node.js 24 for the frontend (the frontend dependency graph needs the newer runtime).
- npm, which is the package manager used by the lockfiles and scripts.
- PostgreSQL reachable on port 5432. Easiest: run only the database container from the repo root after creating the root `.env` as above:

  ```sh
  docker compose up -d db
  ```

### Backend terminal

From the repository root, create a backend-local environment file; the backend loads `.env` from its current folder:

**PowerShell**
```powershell
Copy-Item .env.example backend/.env
```

**macOS/Linux**
```sh
cp .env.example backend/.env
```

Edit `backend/.env` so `DATABASE_URL` points to `localhost:5432` (the template already does), and set `GEMINI_API_KEY` and a unique `ADMIN_API_KEY`. These values are separate from the root `.env` used by Compose’s `db` service. Do not commit either file.

Then run:

```sh
cd backend
npm ci
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

The backend listens on port 4000. Confirm it can reach PostgreSQL at [http://localhost:4000/api/health](http://localhost:4000/api/health).

### Frontend terminal

In a second terminal, from the repository root:

**PowerShell**
```powershell
cd frontend
npm ci
$env:NUXT_PUBLIC_API_BASE = 'http://localhost:4000/api'
npm run dev
```

**macOS/Linux**
```sh
cd frontend
npm ci
NUXT_PUBLIC_API_BASE=http://localhost:4000/api npm run dev
```

Nuxt prints the local URL; by default it is [http://localhost:3000](http://localhost:3000). `NUXT_PUBLIC_API_BASE` tells the browser UI where the separately running Express API is.

## 3. Try the demo cases

Open [http://localhost:3000](http://localhost:3000) and enter the customer email and message for each test:

1. **Automatic approval** — `ava.martinez@example.com` — “I changed my mind about order ORD-10421.” Expected: **APPROVED**.
2. **Automatic denial** — `ethan.rivera@example.com` — “I changed my mind about order ORD-10426.” Expected: **DENIED** because the order is final sale.
3. **Escalation** — `sofia.patel@example.com` — “I changed my mind about order ORD-10425.” Expected: **ESCALATED** because its total is $629.99, above the $500 review threshold.

For the escalation, open [http://localhost:3000/admin](http://localhost:3000/admin) and enter the `ADMIN_API_KEY` from your local `.env` (for manual mode, `backend/.env`). Find the Sofia request and open **Details**. The detail page shows the extracted claim, policy trace, reason codes, LLM source, and audit timeline. For an open escalation, you can record an admin approval or denial and a note. This demo records decisions; it does not issue money.

The outcomes assume Gemini is available for extraction. If the provider is unavailable, the app uses its configured fallback model and then deterministic extraction/reply fallbacks; a conservative extraction may result in escalation instead.

### Start over between test runs

To clear submitted requests and restore the seeded demo data, use the reset command for the way you are running the app. This deletes **all** database contents in that local database, not just the test requests. The four seed requests are recreated.

**Docker Compose** — from the repository root:

```sh
docker compose down -v
docker compose up -d
```

The images remain built; Compose creates a fresh PostgreSQL volume, then the backend reapplies migrations and reruns the seed. Wait for the backend logs to report **“Seeded 15 customers, 42 orders, and 4 historical requests”** and **“Refund API listening on port 4000”** before testing again. Check with:

```sh
docker compose logs --tail 30 backend
```

**Manual backend** — with PostgreSQL running, from the `backend/` directory:

```sh
npx prisma migrate reset --force
```

This drops and recreates the configured database schema, reapplies migrations, and runs the configured Prisma seed. Keep your backend `.env` and database server; this command resets the database contents.

## 4. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Port already in use | Another process/container is listening on 3000, 4000, or 5432. | Stop that process/container or free the port, then rerun Compose. Check `docker compose ps`. |
| Database connection refused | PostgreSQL is stopped, unhealthy, or manual `DATABASE_URL` points at the wrong host/port. | For Docker, check `docker compose ps` and `docker compose logs db`; for manual backend, use `localhost:5432` and start `docker compose up -d db`. |
| Migrations not applied / missing tables | The backend did not complete its migration startup, or manual migrations were skipped. | Docker: inspect `docker compose logs backend`; manual: from `backend/`, run `npm run prisma:migrate` then `npm run prisma:seed`. |
| Missing/invalid Gemini key | `GEMINI_API_KEY` is blank, invalid, or not loaded by the backend. | Set it in the `.env` used by your run mode (root for Compose; `backend/.env` for manual), then recreate/restart the backend. Never print the key in logs. |
| Blank frontend or API errors | Frontend failed to build/start, or `NUXT_PUBLIC_API_BASE` points at the wrong API URL. | Docker: check `docker compose logs frontend backend`; manual: set it to `http://localhost:4000/api`, verify the health URL, then reload. |

## 5. Where things live

- `frontend/` — Nuxt/Vue interface, Pinia stores, and API client.
- `backend/` — Express API, business services, tests, Prisma schema/migrations, and seed data.
- `docs/refund-policy.md` — written policy and rule precedence.
- `docker-compose.yml` — local PostgreSQL, backend, and frontend services.
- `README.md` — architecture overview, API reference, security notes, and complete demo scenario list.
