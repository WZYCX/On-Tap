# On-Tap

Template for:
- **Frontend**: React Native + Expo using **TypeScript**
- **Backend**: Flask API for finding nearby pubs with Google Places

## Backend (Flask)

Path: `backend/`

1. Copy env template and set your Google Maps API key:
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
- `GET /find-pub?lat=51.5074&lng=-0.1278` → returns the 5 nearest pubs from Google Places, looks up `gabriel.szeto@gmail.com` in `backend/database/users.csv`, and adds `contains_fav_beer` based on SerpApi-discovered evidence

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
