# FinanceTerminal

FinanceTerminal is a full-stack market dashboard with a Django REST backend and a React/Vite frontend.  
It provides authentication, entity search, quotes, chart history, fundamentals, market news, watchlist, and notes.

## Project Structure

- `backend/`: Django API (`/api/auth/*`, `/api/market/*`)
- `frontend/frontend/`: React + TypeScript SPA
- `RAPPORT.md`: project report and submission notes

## Prerequisites

- Python 3.12+ (3.13 also works)
- Node.js 20+
- npm 10+

## Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

Backend runs on `http://localhost:8000`.

## Frontend Setup

```bash
cd frontend/frontend
npm install
cp .env.example .env
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Environment Variables

### Backend (`backend/.env`)

- `SECRET_KEY`: Django secret key
- `DEBUG`: `True` for local development
- `ALLOWED_HOSTS`: comma-separated hosts (example: `localhost,127.0.0.1`)
- `CORS_ALLOWED_ORIGINS`: comma-separated frontend origins
- `ALPHA_VANTAGE_API_KEY`: optional placeholder (current market stack uses Yahoo Finance services)

### Frontend (`frontend/frontend/.env`)

- `VITE_API_BASE_URL`: API base URL (default example: `http://localhost:8000/api`)

## Quality Checks

### Frontend

```bash
cd frontend/frontend
npm run lint
npm run build
```

### Backend

```bash
cd backend
source .venv/bin/activate
python manage.py check
python manage.py test
```

## Demo Script (Submission)

1. Register or login.
2. Go to Explorer and search a symbol.
3. Open entity details and show chart/fundamentals/news.
4. Add/remove watchlist item.
5. Create/edit/delete an entity note.

## Known Limitations

- Frontend automated tests are not yet implemented.
- Paper trading schema is present, but API/UI for trading flows is deferred.
- Pagination and advanced filtering are not implemented for notes/watchlist.
