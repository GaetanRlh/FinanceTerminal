# FinanceTerminal — Project Report
**Status:** Work in Progress — Final delivery: March 22, 2026

---

## 1. What is FinanceTerminal?

FinanceTerminal is a personal finance dashboard web application that lets authenticated users track financial instruments (stocks, ETFs, indices) in real time. It aggregates live market data from Yahoo Finance, provides interactive price charts, company fundamentals, financial news, and lets users manage a personal watchlist and attach text notes to any tracked asset.

The application is built with a clear client-server separation: a **Django REST API** on the backend and a **React SPA** on the frontend, communicating exclusively through JSON over HTTP.

---

## 2. Technology Stack

### Backend
| Layer | Technology |
|---|---|
| Language | Python 3.12 |
| Web framework | Django 6.0.3 |
| REST API | Django REST Framework 3.16.1 |
| Authentication | JWT via `djangorestframework-simplejwt` 5.5.1 |
| Market data | `yfinance` ≥ 1.2.0 (Yahoo Finance, no API key required) |
| Symbol search | Yahoo Finance Query API (HTTP, no key) |
| Cross-origin | `django-cors-headers` 4.9.0 |
| Database | SQLite (development) |
| Cache | Django in-memory cache (`LocMemCache`) |
| Environment | `python-dotenv` |

### Frontend
| Layer | Technology |
|---|---|
| Language | TypeScript 5.9 |
| Framework | React 19.2 |
| Build tool | Vite 7.3 |
| UI components | Material UI (MUI) 7.3.9 + Emotion |
| HTTP client | Axios 1.13 |
| Routing | React Router DOM 7.13 |
| Charts | Recharts 3.8 |
| Forms | React Hook Form 7.71 |

---

## 3. Architecture

```
FinanceTerminal/
├── backend/                   ← Django project
│   ├── backend/               ← Project settings, URL root
│   ├── market/                ← Market data app (models, views, services)
│   │   ├── models.py          ← Entity, WatchlistItem, Note
│   │   ├── services.py        ← yfinance wrappers (quote, chart, overview, news, movers)
│   │   ├── views.py           ← REST views (market proxies + CRUD viewsets)
│   │   ├── serializers.py     ← DRF serializers
│   │   └── urls.py            ← /api/market/ routing
│   └── users/                 ← Auth app (custom user model + JWT views)
│       ├── models.py          ← CustomUser (email-based)
│       ├── views.py           ← Register, Login, Me, PasswordReset
│       └── serializers.py
│
└── frontend/frontend/         ← React/Vite project
    └── src/
        ├── pages/             ← Full-page views
        ├── components/        ← Reusable UI components
        ├── services/api.ts    ← All API calls, types, Axios instance
        ├── contexts/          ← React Context (auth state)
        └── theme.ts           ← MUI dark terminal theme
```

### Request flow
```
Browser (React SPA)
      │  JWT Bearer token in Authorization header
      ▼
Django REST API  (localhost:8000)
      │  Validates JWT → routes to view
      ▼
  market/services.py  →  yfinance / Yahoo Finance HTTP
                      →  Django cache (avoids redundant API calls)
      │
      ▼
  SQLite DB (entities, watchlist items, notes)
```

---

## 4. Features Implemented

### 4.1 Authentication System
- **Register**: `POST /api/auth/register/` — creates a user (email + full name + password), returns JWT access + refresh tokens immediately (no email verification step yet).
- **Login**: `POST /api/auth/login/` — returns JWT tokens. Protected with a **brute-force throttle**: after 5 consecutive failures from the same IP, the endpoint blocks that IP for 15 minutes (implemented in `ThrottledTokenObtainPairView`).
- **Token refresh**: `POST /api/auth/token/refresh/` — the Axios interceptor in `api.ts` calls this automatically when a 401 is received, then retries the original request. If the refresh token is also expired, the user is redirected to `/login`.
- **Me**: `GET /api/auth/me/` — returns the authenticated user's profile.
- **Password reset**: `POST /api/auth/password-reset/` — returns `200` for existing accounts and `400` when the email is unknown (demo-mode behavior, no SMTP integration yet).
- JWT token lifetime: **access = 30 min**, **refresh = 7 days**.

### 4.2 Dashboard Page (`/`)
Displays a real-time overview of the market:
- **6 major indices / ETFs**: SPY (S&P 500), QQQ (NASDAQ 100), DIA (Dow Jones), IWM (Russell 2000), VIX (Volatility), GLD (Gold) — each shown as a card with live price and % change.
- **Market status badge**: shows Open / Pre-Market / After-Hours / Closed based on US Eastern time, with no external API call.
- **Top Movers table**: three tabs — Top Gainers, Top Losers, Most Actively Traded — computed over a curated scan of 50 S&P 500 large-cap tickers.
- **Financial news feed**: latest articles for the market with keyword-based sentiment labelling (Bullish / Bearish / Neutral).
- **TickerTape**: a horizontally scrolling ticker banner at the top showing the same 6 indices live.

### 4.3 Entity System
An **Entity** is the internal database record for a tracked financial instrument. It stores:
- `nom` (company/fund name)
- `ticker` (unique, e.g. `AAPL`)
- `secteur` (sector)
- `valeur_totale` (last known price, auto-updated on quote fetch)

**Entities page (`/entities`)**: search by ticker or name using the Yahoo Finance search API, view a list of all tracked entities with current prices, add new ones.

When a user navigates to an entity detail page, the app **auto-creates the entity** in the database if it does not already exist (the `ensureAndFetch` flow in `EntityDetailPage`), so the user never has to manually register entities.

### 4.4 Entity Detail Page (`/entities/:symbol`)
The core feature of the app. Divided into 4 tabs:

**Chart tab**
- Interactive line chart of the daily closing price, powered by Recharts.
- Period selector: 1M, 3M, 6M, 1Y, ALL (up to 5 years of history).
- All data is loaded at once on page entry (5-year fetch) and filtered client-side for fast period switching without extra API calls.
- 52-week high/low displayed as reference lines.

**Fundamentals tab**
- Company overview card: sector, industry, country, exchange, currency.
- Key financial metrics: Market Cap, P/E (trailing and forward), PEG, P/B, P/S, EPS, Beta, Dividend Yield (as %), EV/EBITDA, Analyst target price.
- Revenue metrics: Revenue TTM, Gross Profit, EBITDA, Operating Margin, Profit Margin, ROE, ROA.
- 52-week high/low, 50-day and 200-day moving averages.

**News tab**
- Latest news articles for the symbol with title, summary, source, publication time, sentiment badge, and link to full article.

**Notes tab**
- User-specific text notes attached to this entity.
- Create, edit (inline), and delete notes with full error handling and confirmation.

**Watchlist toggle**
- Star icon in the page header: add/remove the entity from the user's watchlist with a single click.

### 4.5 Watchlist Page (`/watchlist`)
- Displays all entities the user has starred.
- Each row loads its live quote independently (per-row loading indicator) so the table appears immediately without waiting for all quotes.
- Clicking a row navigates to the entity detail page.
- Remove button on each row.

### 4.6 Notes Page (`/notes`)
- Global view of all notes across all entities.
- Sorted by creation date (newest first).
- Create standalone notes (not attached to an entity) or entity-linked notes.
- Inline edit and delete.

### 4.7 Command Palette
- Triggered with `Ctrl+K` / `Cmd+K` from anywhere in the app.
- Fuzzy-search navigation: type any page name or action to jump to it instantly.
- Actions: Dashboard, Entities, Watchlist, Notes, Logout.

---

## 5. API Endpoints Reference

**Base URL**: `http://localhost:8000/api/`

### Auth (`/auth/`)
| Method | Endpoint | Auth required | Description |
|---|---|---|---|
| POST | `/auth/register/` | No | Create account, returns tokens |
| POST | `/auth/login/` | No | Login, returns tokens (rate-limited) |
| POST | `/auth/token/refresh/` | No | Refresh access token |
| GET | `/auth/me/` | Yes | Current user profile |
| POST | `/auth/password-reset/` | No | Request password reset |

### Market data (`/market/`)
| Method | Endpoint | Auth required | Description |
|---|---|---|---|
| GET | `/market/search/?q=<query>` | No | Search tickers/companies |
| GET | `/market/quote/?symbol=<ticker>` | No | Real-time quote |
| GET | `/market/time-series/?symbol=<ticker>&interval=<period>` | No | Historical OHLCV data |
| GET | `/market/overview/?symbol=<ticker>` | No | Company fundamentals |
| GET | `/market/news/?tickers=<ticker>&limit=<n>` | No | News articles |
| GET | `/market/top-movers/` | No | Top gainers, losers, most active |
| GET | `/market/market-status/` | No | US market open/closed status |

### CRUD (`/market/`)
| Method | Endpoint | Auth required | Description |
|---|---|---|---|
| GET/POST | `/market/entities/` | Yes | List / create entities |
| GET | `/market/entities/?ticker=<ticker>` | Yes | Filter entity by ticker |
| GET/PATCH/DELETE | `/market/entities/<id>/` | Yes (PATCH/DELETE: admin only) | Entity detail |
| GET/POST | `/market/watchlist/` | Yes | User's watchlist |
| DELETE | `/market/watchlist/<id>/` | Yes | Remove from watchlist |
| GET/POST | `/market/notes/` | Yes | User's notes |
| GET/PATCH/DELETE | `/market/notes/<id>/` | Yes | Note detail |

---

## 6. Database Models

### `CustomUser` (users app)
| Field | Type | Notes |
|---|---|---|
| `email` | EmailField | Primary identifier (unique) |
| `full_name` | CharField | Optional |
| `is_active` | BooleanField | |
| `is_staff` | BooleanField | Admin access |
| `date_joined` | DateTimeField | Auto |

### `Entity` (market app)
| Field | Type | Notes |
|---|---|---|
| `nom` | CharField | Company name |
| `ticker` | CharField | Unique, e.g. AAPL |
| `secteur` | CharField | Sector |
| `valeur_totale` | DecimalField | Last price (auto-updated) |

### `WatchlistItem` (market app)
| Field | Type | Notes |
|---|---|---|
| `user` | FK → CustomUser | |
| `entity` | FK → Entity | |
| `added_at` | DateTimeField | Auto |
| *(unique_together)* | (user, entity) | No duplicates |

### `Note` (market app)
| Field | Type | Notes |
|---|---|---|
| `user` | FK → CustomUser | |
| `entity` | FK → Entity (nullable) | Optional entity link |
| `titre` | CharField | |
| `contenu` | TextField | |
| `created_at` | DateTimeField | Auto |

---

## 7. Market Data & Caching

All market data is fetched via **yfinance** (Yahoo Finance), which requires no API key and has generous rate limits.

| Data type | Cache TTL | Rationale |
|---|---|---|
| Quote | 2 minutes | Price updates frequently during trading hours |
| Time series | 30 minutes | Historical data changes slowly intraday |
| Company overview | 24 hours | Fundamentals are stable |
| News | 15 minutes | Reasonable freshness |
| Top movers | 10 minutes | Computed from 50 tickers, expensive |
| Market status | 1 minute | Pure time calculation, cached to reduce overhead |

Caching is handled by **Django's LocMemCache** (in-process, single-server). This is sufficient for development; a production deployment would use Redis.

---

## 8. Security Measures Implemented

| Threat | Mitigation |
|---|---|
| Unauthenticated access | All CRUD endpoints require `IsAuthenticated` |
| Privilege escalation | Entity edit/delete restricted to `IsAdminUser` |
| Password brute force | `ThrottledTokenObtainPairView`: 5 failures → 15 min IP block |
| User enumeration via password reset | Reset endpoint always returns the same 200 response regardless of whether the email exists |
| CORS | Explicitly whitelisted to `localhost:5173` only |
| Cross-site request forgery | Django CSRF middleware active |
| Token expiry | Access tokens expire in 30 min; auto-refreshed by Axios interceptor |
| Watchlist isolation | `WatchlistViewSet.get_queryset()` always filters by `request.user` |
| Note isolation | `NoteViewSet.get_queryset()` always filters by `request.user` |

---

## 9. Frontend Architecture Details

### Theme
Custom MUI dark theme (`theme.ts`) with a terminal aesthetic: near-black backgrounds (`#0a0e1a`), monospace JetBrains Mono font for numbers, green (`#00ff88`) / red (`#ff3366`) for positive/negative changes, and a subtle grid-line background pattern.

### Authentication flow
`AuthContext` (React Context) manages the auth state globally. On login/register, tokens are stored in `localStorage`. On app load, `api.ts` synchronously reads the stored token from `localStorage` at module initialization, ensuring the first API call is already authenticated (avoids a race condition where a page loads before the context initializes).

### Axios interceptor (auto-refresh)
When any API call returns a 401:
1. The interceptor reads the refresh token from `localStorage`.
2. Calls `/api/auth/token/refresh/` with it.
3. Updates the stored access token and retries the original request.
4. If refresh also fails (expired), clears storage and redirects to `/login`.

### Protected routes
All pages except `/login` and `/register` are wrapped in `<ProtectedRoute>`, which redirects unauthenticated users to `/login`.

### Entity detail — ensureAndFetch pattern
When navigating to `/entities/AAPL`, the component:
1. Queries `GET /market/entities/?ticker=AAPL`.
2. If not found, calls `POST /market/entities/` to create it.
3. If creation fails with 400 (already exists, race condition), queries again to get the existing record.
4. Uses the resulting `entityId` for all watchlist and note operations.

---

## 10. What is Not Yet Done (Before March 22)

The following features are planned for the final delivery:

- [ ] **Email-based password reset**: the endpoint exists but does not actually send an email. Requires SMTP configuration (e.g. SendGrid or Django's console email backend for demo purposes).
- [ ] **Portfolio / Holdings tracker**: a page where users can log their actual positions (buy price, quantity) and see overall P&L.
- [ ] **Production deployment configuration**: `DEBUG=False`, PostgreSQL instead of SQLite, Redis for caching, `ALLOWED_HOSTS` properly set, static files served by WhiteNoise or a CDN.
- [ ] **Frontend automated tests**: backend tests are implemented and passing, but frontend still needs unit/integration coverage.
- [ ] **Pagination**: the entities and notes lists currently return all results without pagination.
- [ ] **Search within watchlist and notes pages**: currently no client-side or server-side filtering on these pages.
- [ ] **Mobile responsiveness**: the layout is primarily designed for desktop/laptop screens.

---

## 11. How to Run Locally

### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # edit SECRET_KEY if needed
python manage.py migrate
python manage.py runserver    # → http://localhost:8000
```

### Frontend
```bash
cd frontend/frontend
npm install
npm run dev                   # → http://localhost:5173
```

---

## 12. Git Repository

- **Repository**: https://github.com/GaetanRlh/FinanceTerminal (fork)
- **Active branch**: `develop`
- **Feature branch**: `feat/v2-improvements` (merged into develop)
- **Key commits**:
  - `5cd484c` — backend bug fixes and paper trading removal
  - `4235647` — frontend UI improvements, new components, bug fixes
  - `0b7357d` — merge into develop

---

## 13. Submission Update (March 20, 2026)

### Delivery Readiness
- Frontend quality gates are passing: `npm run lint` and `npm run build`.
- Backend quality gates are passing: `python manage.py check` and `python manage.py test` (27 tests, all green).
- Frontend API base URL is now environment-driven via `VITE_API_BASE_URL`.
- Backend config is hardened for deployment setup with explicit `ALLOWED_HOSTS` and env-driven CORS origins.

### Paper Trading Status
- Database schema and code model layer are now aligned for paper trading objects (`PaperPortfolio`, `PaperPosition`, `PaperTrade`).
- API endpoints and UI for paper trading are intentionally deferred to a future iteration to preserve submission scope.

### Demo Flow (Used for Final Presentation)
1. Register/login.
2. Search entity from Explorer.
3. Open entity details (chart, fundamentals, news).
4. Add/remove from watchlist.
5. Create/edit/delete notes.

---

*Document updated March 20, 2026 — FinanceTerminal v0.3 (submission candidate)*
