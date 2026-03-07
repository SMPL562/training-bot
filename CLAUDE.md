# Training Bot (Hinglish Conversational AI Calling Bot)

## Project Overview
- **Stack**: FastAPI + React 18 + PostgreSQL 15 + Docker Compose + SQLAlchemy + TailwindCSS
- **Description**: Real-time voice-based Hinglish chatbot for sales training with AI Coach features including template creation, team management, roleplay simulations, and feedback. Uses OpenAI API for conversational AI.
- **Tier**: C (Stable/Maintenance)

## File Organization
- Never save working files to root folder
- `backend/` - FastAPI application (`main.py`, `database.py`, `models.py`, `schemas.py`, `crud.py`, `feedback.py`)
- `frontend/` - React application (Create React App with react-router-dom, axios, TailwindCSS)
- `docker-compose.yml` - Orchestrates backend, frontend, db, and dev services
- `.env.example` - Environment variable template

## Build & Test
```bash
# Docker (recommended)
docker-compose up --build          # Build and start all services
docker-compose down                # Stop all services
docker-compose logs -f backend     # View backend logs

# Backend (standalone)
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (standalone)
cd frontend
npm install
npm start                          # Dev server on port 3000
npm run build                      # Production build
npm test                           # Run tests
```

## Environment Variables
- `OPENAI_API_KEY` - OpenAI API key for conversational AI
- `DATABASE_URL` - PostgreSQL connection string (default: `postgresql://user:password@localhost:5432/hinglish_chatbot`)

## Key Ports
- Backend: 8000
- Frontend: 3000
- PostgreSQL: 5432

## Security Rules
- NEVER hardcode API keys, secrets, or credentials in any file
- NEVER pass credentials as inline env vars in Bash commands
- NEVER commit .env, .claude/settings.local.json, or .mcp.json to git
- Always validate user input at system boundaries
- Use .env.example as template; never put real keys in it
