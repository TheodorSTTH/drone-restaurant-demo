## Drone Restaurant Demo

An iPad‑friendly dashboard for restaurant staff to manage drone‑delivered orders: accept/reject orders, delay/cancel/complete, and mark orders as placed in the garden for drone pickup. The frontend is a React SPA; the backend is Django with PostgreSQL. Everything is containerized with Docker Compose.

## Stack and architecture

- Frontend: React + TypeScript (Vite), shadcn/ui, Tailwind CSS
- Backend: Django (session auth, admin, simple JSON endpoints)
- Database: PostgreSQL
- Web server/proxy: NGINX (serves built frontend; proxies to Django)
- Containers: `db`, `backend`, `frontend` (prod-like), `frontend-dev` (HMR)

## Repository structure

- `backend/` – Django project (`project/`), apps (`business_logic/`, `core/`), server-rendered auth templates
- `frontend/` – React SPA (`src/` pages/components), `nginx.conf` for prod
- `docker-compose.yml` – prod-like setup (NGINX + Gunicorn)
- `docker-compose.override.yml` – dev/HMR setup (Vite on port 5173)
- `manual` – high-level system overview

## Prerequisites

- Docker and Docker Compose
- Optional (for local frontend-only development): Node 20+

## Environment variables

Create a `.env` file in the repository root:

```bash
POSTGRES_DB=drone_demo
POSTGRES_USER=drone_user
POSTGRES_PASSWORD=drone_pass
DJANGO_SECRET_KEY=change-me-please
DJANGO_DEBUG=1
DJANGO_ALLOWED_HOSTS=localhost 127.0.0.1 backend abc.def.no
DJANGO_CSRF_TRUSTED_ORIGINS=http://localhost:5173
LOGIN_REDIRECT_URL = "/"      # after successful login
LOGOUT_REDIRECT_URL = "/"     # after logout
```

Docker Compose automatically loads variables from `.env` in the project root.

## Getting started (dev, with HMR)

Start Vite (5173) + Django devserver (8000) + Postgres (host port 15432):

```bash
docker compose up -d db backend frontend-dev
```

On first run, apply migrations and create a superuser:

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

Open `http://localhost:5173`. Log in via the link to `/accounts/login/` (server-rendered Django page). After logging in, SPA requests to `/api/*` work via the session cookie.

Tip: If the `frontend` service on port 80 is running from a previous session, stop it during dev:

```bash
docker compose stop frontend
```

## Prod-like locally (NGINX + Gunicorn)

Start NGINX on port 80, Django via Gunicorn on 8000, and Postgres:

```bash
docker compose up -d
docker compose exec backend python manage.py migrate
```

Open `http://localhost/`.

## Backend endpoints (overview)

- `GET /api/me/` – current user info (id, username, email, restaurant, is_admin, date_joined)
- `GET /api/products/`
- `POST /api/product_create/`
- `GET /api/orders/` – grouped as:
  - `new_orders`, `in_progress_orders`, `awaiting_pickup_orders`
- `POST /api/preparation_accepted/` – `{ order_id, projected_preparation_time_minutes? }`
- `POST /api/preparation_rejected/` – `{ order_id }`
- `POST /api/preparation_step/` – `{ order_id, status: "de"|"d"|"c", delaytime_minutes? }`
  - When `status="d"`, a `Delivery` is created with pickup ETA 5 min and delivery ETA 15 min.

Authentication uses Django session auth. Login/Logout/Reset live under `/accounts/...`. The SPA links to these pages.

## Data model (short overview)

Core entities in `backend/business_logic/`:

- `Order` with lifecycle statuses: `PENDING/ACCEPTED/REJECTED/DELAYED/CANCELED/COMPLETED`
- `OrderProduct`, `OrderAnswer`, optional `Preparation`/`PreparationStep`, `Delivery`
- `Restaurant`, `EndUser`, `Product`, and `AuthUserRestaurant` linking users to a restaurant

## Troubleshooting

- 403 CSRF: ensure `DJANGO_CSRF_TRUSTED_ORIGINS` includes `http://localhost:5173` in dev and SPA sends `X-CSRFToken`.
- 400 Bad Request: add hosts to `DJANGO_ALLOWED_HOSTS`.
- Port already in use: Postgres maps to `127.0.0.1:15432`; adjust in `docker-compose.yml` if needed.
- SPA cannot reach backend: verify the dev proxy and that the backend is running.

## Development notes

- UI components live in `frontend/src/components/ui/` (shadcn/ui) and can be customized.
- Routing: SPA routes with `react-router`; server-rendered auth pages under `/accounts/...`.
- In prod, NGINX serves the SPA (`try_files ... /index.html`) and proxies `/api/`, `/accounts/`, `/admin/` to Django.


