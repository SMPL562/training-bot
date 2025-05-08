Hinglish Conversational AI Calling Bot
A real-time, voice-based Hinglish chatbot for sales training, with AI Coach features including template creation, team management, roleplay simulations, and feedback.
Setup

Clone the Repository:
git clone <your-repo-url>
cd hinglish-chatbot


Environment Variables:

Copy .env.example to .env in the root directory and add your OpenAI API key:OPENAI_API_KEY=your-api-key
DATABASE_URL=postgresql://user:password@localhost:5432/hinglish_chatbot


Alternatively, set OPENAI_API_KEY as a Codespace secret.


Run with Docker:

Ensure Docker Compose is installed (see below for Codespaces).
Start the services:docker-compose up --build




Codespaces Setup:

Create a Codespace for the repository.
The .devcontainer/devcontainer.json installs docker-compose, postgresql-client, python3, nodejs, and dependencies.
If in recovery mode (Alpine container), install docker-compose:sudo apk add docker-compose


Exit recovery mode by updating devcontainer.json and rebuilding:# In VS Code Command Palette (Ctrl+Shift+P)
Codespaces: Rebuild Container





Development

Backend: FastAPI with PostgreSQL (backend/main.py).
Frontend: React (frontend/src/App.jsx).
Database: Initialize with backend/database.py.

Testing

Create templates via the UI.
Start roleplay sessions and test Hinglish interactions.
Check feedback reports for session metrics.
Verify logs in backend/chatbot.log.

Features

Real-time Hinglish voice interaction (600ms-1s latency).
AI Coach Template System for scenario configuration.
Team management and user roles.
Dynamic feedback with goal-based metrics.

Troubleshooting

Port Conflicts:
Ensure dev service has no ports section to avoid conflicts with backend, frontend, db.
Verify forwardPorts in devcontainer.json.


.env Issues:
Place .env in the root directory (hinglish-chatbot/.env).
Check OPENAI_API_KEY and DATABASE_URL are set.


Recovery Mode:
Check creation.log:cat /workspaces/.codespaces/.persistedshare/creation.log


Ensure devcontainer.json uses service: "dev".
Rebuild (Ctrl+Shift+P > “Codespaces: Rebuild Container”).


apt-get Not Found:
In Alpine:sudo apk add <package>


Restart Codespace for Ubuntu-based dev service.


Docker Compose Not Found:
Install in Alpine:sudo apk add docker-compose


Or in Ubuntu:sudo apt-get update
sudo apt-get install -y docker-compose




Database: Verify:psql -h localhost -U user -d hinglish_chatbot -W



