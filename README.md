# 🛡️ Pune Urban Shield — Digital Twin Platform

**PMC + PCMC Smart City Crisis Management & Urban Simulation**

---

## 🚀 Quick Start

### Step 1 — Start the Backend (FastAPI)

Open a terminal and run:

```powershell
cd "d:\PCET 2K26\backend"
python main.py
```

- ✅ Backend runs at: **http://localhost:8000**
- 📖 API Docs (Swagger): **http://localhost:8000/api/docs**

---

### Step 2 — Start the Admin Web Dashboard (React)

Open a **second terminal** and run:

```powershell
cd "d:\PCET 2K26\admin-web"
npm start
```

- ✅ Dashboard runs at: **http://localhost:3000**
- 🔐 Login: `admin@pmc.gov.in` / `pmc2026`

---

### Step 3 — Flutter Citizen App (Android Emulator / USB Device)

Open a **third terminal** and run:

```powershell
cd "d:\PCET 2K26\citizen-app"
flutter run
```

- 📱 Connects to backend at: `http://10.0.2.2:8000` (emulator) or `http://YOUR_PC_IP:8000` (real device)

---

## 🗂️ Project Structure

```
PCET 2K26/
├── backend/              ← Python FastAPI (Central Brain)
│   ├── main.py           ← All API endpoints + simulation engine
│   ├── database.py       ← MongoDB Atlas + Cloudinary layer
│   ├── .env              ← Your secret keys (MONGO_URI, Cloudinary)
│   └── .env.example      ← Template — copy to .env and fill in
│
├── admin-web/            ← React.js Admin Dashboard
│   └── src/
│       ├── pages/        ← Dashboard, Map, Alerts, Analytics, Wards, IoT
│       └── store/        ← Zustand global state + WebSocket
│
└── citizen-app/          ← Flutter Android/iOS App
    └── lib/
        └── main.dart     ← All citizen app screens
```

---

## 🔌 Environment Variables

Create `backend/.env` (copy from `.env.example`):

```env
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/pune_urban_shield
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/weather/live` | Live weather from Open-Meteo |
| GET | `/api/weather/forecast` | 24-hour rainfall forecast |
| GET | `/api/alerts/active` | All active city alerts |
| GET | `/api/map/wards` | All 22 ward polygons + risk data |
| GET | `/api/map/flood-nodes` | Flood monitoring points |
| POST | `/api/simulate/flood` | Run flood simulation |
| POST | `/api/simulate/traffic` | Run traffic simulation |
| GET | `/api/iot/sensors` | IoT sensor readings (10 sensors) |
| GET | `/api/evacuation/routes` | Evacuation routes + shelters |
| GET | `/api/citizen/safety-summary` | Citizen safety status |
| POST | `/api/reports/citizen` | Submit citizen report (photo + GPS) |
| GET | `/api/reports/all` | Admin: view all citizen reports |
| GET | `/api/analytics/ward-comparison` | Ward-by-ward comparison |
| GET | `/api/reports/city-summary` | Full city export report |
| GET | `/api/db/status` | MongoDB + Cloudinary connection status |
| WS | `/ws/live-feed` | WebSocket live data (5s push) |

---

## 🏛️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend | Python + FastAPI | REST API + WebSocket server |
| Simulation | NumPy + custom algorithms | Flood & traffic modelling |
| Database | MongoDB Atlas (motor) | Persistent cloud storage |
| Photos | Cloudinary | Citizen report photo uploads |
| Weather | Open-Meteo (free, no key) | Live WMO weather data |
| Admin UI | React.js + Zustand | Web command center |
| Maps | Leaflet.js + OpenStreetMap | Geographic visualization |
| Charts | Recharts | Analytics dashboards |
| Citizen App | Flutter + Dart | Android/iOS mobile app |

---

## 🔐 Demo Login Credentials

| Email | Password | Role |
|-------|----------|------|
| `admin@pmc.gov.in` | `pmc2026` | PMC Commissioner |
| `admin@pcmc.gov.in` | `pcmc2026` | PCMC Commissioner |
| `ops@urbanshield.in` | `ops2026` | System Administrator |

---

## 📋 Data Honesty Notice

| Data | Source | Status |
|------|--------|--------|
| Live Weather | Open-Meteo (WMO/ECMWF) | ✅ **REAL** |
| Ward Geography | OpenStreetMap + PMC boundaries | ✅ **REAL** |
| Population | Census 2021 | ✅ **REAL** |
| Road Standards | IRC Highway Manual | ✅ **REAL** |
| Flood Simulation | Manning-Rational Method (IRC SP-50) | 🔵 **MODELLED** |
| Traffic Volumes | IRC capacity formula | 🔵 **MODELLED** |
| IoT Sensors | Simulated (no real hardware) | 🔵 **MODELLED** |

---

*Pune Urban Shield v2.0 · Drona Engine · © 2026 PMC + PCMC · Smart City Mission, GoI*
