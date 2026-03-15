# Training Bot - Environment Reference

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+ / npm
- Docker & Docker Compose
- PostgreSQL 15 (provided via Docker, or install locally)

### Setup (Docker -- recommended)

```bash
# Clone
git clone https://github.com/SMPL562/training-bot.git
cd training-bot

# Configure environment
cp .env.example .env
# Edit .env: set OPENAI_API_KEY (required)

# Start all services
docker compose up --build
```

This starts four services:
- **backend** (FastAPI on port 8000)
- **frontend** (React dev server on port 3000)
- **db** (PostgreSQL 15 on port 5432)
- **dev** (Ubuntu devcontainer, sleeps forever)

### Setup (standalone, no Docker)

```bash
# Backend
cd backend
pip install -r requirements.txt
# Requires a running PostgreSQL instance
export DATABASE_URL="postgresql://user:password@localhost:5432/hinglish_chatbot"
export OPENAI_API_KEY="your-key"
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm start
```

### Access

| Service   | URL                    |
|-----------|------------------------|
| Frontend  | http://localhost:3000  |
| Backend   | http://localhost:8000  |
| PostgreSQL| localhost:5432         |

### Codespaces

The repo includes `.devcontainer/devcontainer.json` for GitHub Codespaces. It installs docker-compose, postgresql-client, python3, nodejs, and project dependencies automatically.

## Production / Deployment

No production deployment is currently configured. The Docker Compose setup is the intended deployment method. The backend Dockerfile runs `uvicorn main:app --host 0.0.0.0 --port 8000` and the frontend Dockerfile runs `npm start`.

## Environment Variables

| Variable         | Required | Default                                                      | Description                              |
|------------------|----------|--------------------------------------------------------------|------------------------------------------|
| `OPENAI_API_KEY` | Yes      | --                                                           | OpenAI API key for Realtime API (voice)  |
| `DATABASE_URL`   | No       | `postgresql://user:password@db:5432/hinglish_chatbot` (Docker) | PostgreSQL connection string            |
| `POSTGRES_USER`  | No       | `user`                                                       | PostgreSQL username (Docker db service)  |
| `POSTGRES_PASSWORD` | No    | `password`                                                   | PostgreSQL password (Docker db service)  |
| `POSTGRES_DB`    | No       | `hinglish_chatbot`                                           | PostgreSQL database name                 |

Source: `.env.example`

**Note on DATABASE_URL**: When running via Docker Compose, the hostname is `db` (the service name). When running standalone or in Codespaces, use `localhost`.

## CI/CD

**Pipeline**: `.github/workflows/ci.yml`
**Runs on**: `ubuntu-latest`
**Triggers**: Push to `main`/`master`, pull requests to `main`/`master`

### Jobs (parallel)

1. **lint-backend** -- flake8 on `backend/` (fatal errors `E9,F63,F7`), pip-audit (advisory)
2. **build-frontend** -- `npm install` + `npm run build` in `frontend/`, npm audit (advisory)
3. **build-docker** -- Builds backend Docker image without pushing
4. **summary** -- Aggregates results from all jobs

### Status

GREEN -- runs on GitHub-hosted runners.

## Troubleshooting

### `psycopg2` build fails on macOS

Use the binary package (already in requirements.txt as `psycopg2-binary`). If issues persist:
```bash
brew install postgresql
pip install psycopg2-binary
```

### Database connection refused (standalone mode)

Ensure PostgreSQL is running and `DATABASE_URL` uses `localhost`, not `db`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/hinglish_chatbot
```

### Port conflict on 3000 or 8000

Kill existing processes or change ports:
```bash
# Find what's on port 3000
lsof -i :3000

# Or change in docker-compose.yml
ports:
  - "3001:3000"
```

### OpenAI Realtime API rate limits

The backend implements automatic backoff (`rate_limit_delay`). If you hit 429 errors frequently, reduce concurrent WebSocket sessions or check your OpenAI plan limits.

### Frontend build fails in CI

The CI runs with `CI=false` to prevent treating warnings as errors (Create React App behavior). If the build fails locally, check for actual import/syntax errors, not just warnings.

### `wavtools.js` syntax error

A known fix was applied -- if you see syntax errors from `frontend/src/wavtools.js`, pull the latest from `main`.

### Logs

Backend logs to `backend/chatbot.log`. Check this for WebSocket connection issues, OpenAI API errors, and session transcripts.
