# On-Tap

Template for:
- **Frontend**: React Native + Expo using **TypeScript**
- **Backend**: Flask API with a **direct PostgreSQL connection** to Supabase

## Backend (Flask + Supabase direct DB)

Path: `backend/`

1. Copy env template and set your Supabase connection string:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Run Flask server:
   ```bash
   python backend/app.py
   ```

Available endpoints:
- `GET /health` → app health
- `GET /db-health` → runs `SELECT 1` against Supabase Postgres

## Frontend (React Native + TypeScript)

Path: `frontend/`

1. Install dependencies:
   ```bash
   cd frontend && npm install
   ```
2. Type check:
   ```bash
   npm run typecheck
   ```
3. Start app:
   ```bash
   npm run start
   ```
