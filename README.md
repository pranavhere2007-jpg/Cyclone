# 🌀 OYA: Real-Time Satellite Intelligence & Tropical Cyclone Early Warning System

> **Smart India Hackathon (SIH) 2026 Finalist**
> An end-to-end AI pipeline for early cyclone detection, intensity classification, and track forecasting in the North Indian Ocean basin.

---

## 📌 Overview

Named after the Yoruba deity of winds, storms, and transformation, **OYA** bridges the gap between raw satellite observations and emergency response. Manual or compute-heavy satellite processing causes delays during rapid cyclone intensification. OYA automates frame ingestion, runs lightweight deep-learning models, tracks intensity and position in real time, and switches to **Rapid Monitoring** when a threat is detected.

**Data flow in one line:** multi-source satellite + wind data → CNN detects/classifies → Grad-CAM validates → GRU predicts track/intensity → model services → Express API → React dashboard, with a parallel path that flags disturbances for Rapid Scan tasking.

---

## 🎯 Key Features

- **Automated telemetry ingestion (`SIMSAT`)**: simulates space-to-ground frame transmission, scan-cycle aware, and switches polling between *Monitoring* and *Rapid Monitoring*.
- **CNN detection & classification**: custom-trained CNN detects cyclones and classifies intensity on the IMD scale (Depression → Super Cyclonic Storm), with a confidence score.
- **Explainability (Grad-CAM)**: confirms the model focuses on real cyclone structure (eye, spiral bands) rather than artifacts.
- **Rapid Scan request drafting**: on detection, auto-drafts a request (sector, coordinates, reference image, Grad-CAM justification, confidence) for the IMD/ISRO coordination channel.
- **GRU track & intensity forecasting (6-24 h)**: predicts future positions, wind speed, and central pressure from past position, intensity, and wind direction/speed.
- **Risk & resource prioritization** 🚧 *(planned)*: overlays population density and coastal zones (Bay of Bengal, Arabian Sea) to rank areas at risk.
- **Command dashboard**: GIS map with live telemetry and tracking (built). Public-facing dashboard (personalized alerts, helplines) 🚧 *(planned)*.

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     DATA SOURCES                         │
│  INSAT imagery (IR / VIS / WV) • Scatterometer winds     │
│  IMD historical tracks • Population density              │
└────────────────────────────┬─────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────┐
│  SIMSAT Simulator (Python)  — scan-cycle aware frames    │
└────────────────────────────┬─────────────────────────────┘
                             │ POST /api/satellite/upload
                             ↓
┌──────────────────────────────────────────────────────────┐
│           Node.js / Express Backend (OYA API)            │
│  Orchestration • historical comparison • population risk │
│  report moderation • helpline data                       │
└──────────┬───────────────────────────────────┬───────────┘
           │ POST /predict                     │ POST /forecast
           ↓                                   ↓
┌─────────────────────────┐        ┌───────────────────────────┐
│ CNN Model (Render)      │        │ GRU Model (Cloudflare)    │
│ • Detection             │        │ • Track forecast          │
│ • IMD classification    │        │ • Intensity / pressure    │
│ • Grad-CAM + confidence │        │   trend (6-24 h)          │
└────────────┬────────────┘        └─────────────┬─────────────┘
             │  ↳ Rapid Scan request draft       │
             └───────────────┬───────────────────┘
                             ↓ write telemetry
┌──────────────────────────────────────────────────────────┐
│               Supabase PostgreSQL (Cloud DB)             │
└────────────────────────────┬─────────────────────────────┘
                             ↓ real-time sync
┌──────────────────────────────────────────────────────────┐
│             React + Vite Dashboard (OYA Portal)          │
│  Public: map, info panel, personalized alerts, helplines │
│  Authority: history, risk view, verified reports, Grad-CAM│
└──────────────────────────────────────────────────────────┘
```

---

## ✅ Project Status

| Component | Status |
| :--- | :--- |
| SIMSAT simulator, Express backend, Supabase | ✅ Done |
| CNN detection/classification, GRU forecasting | ✅ Done |
| Authority command dashboard (map, telemetry) | ✅ Done |
| Population risk & resource prioritization | 🚧 Planned |
| Public dashboard (alerts, helplines) | 🚧 Planned |

---

## 📝 Design Note

The initial proposal used a pretrained backbone (ResNet50 / EfficientNet). During implementation we moved to a **custom CNN** trained on our own satellite frames, which keeps inference lightweight for free-tier hosting and gives us full control over the architecture. All other pipeline stages are unchanged.

---

## 🛠 Tech Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| Frontend | React, Vite, Tailwind CSS, Leaflet.js | Live GIS dashboard |
| Backend | Node.js, Express, Multer | REST gateway, pipeline orchestrator |
| Simulator | Python 3, Requests | Satellite frame streaming |
| Database | Supabase (PostgreSQL) | Cyclone records & tracking history |
| Detection AI | Custom CNN, Grad-CAM, hosted on Render | Detection & intensity classification |
| Prediction AI | GRU, hosted on Cloudflare | Track & intensity forecasting |

---

## 👥 User Roles

> 🚧 The public dashboard and population risk & resource prioritization are **not yet implemented**; the table below is the target design.

| Public users | Authorities only |
| :--- | :--- |
| Map with position and predicted track/cone | Historical cyclone comparison |
| Cyclone info panel and last-updated time | Population risk & resource prioritization |
| Location-based personalized risk alert | Verified on-ground report feed |
| Helplines and emergency contacts | Grad-CAM overlay toggle |

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- Python 3.9+
- A Supabase project (managed PostgreSQL)

### Installation

```bash
git clone https://github.com/<your-org>/OYA.git
cd OYA
```

**Backend**

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Model service endpoints
CNN_MODEL_URL=https://cyclonepredictmodel.onrender.com/predict
GRU_MODEL_URL=https://your-gru-endpoint.workers.dev/forecast
MODEL_API_KEY=your_optional_api_key
```

**Frontend**

```bash
cd ../frontend
npm install
```

Create `frontend/.env`:

```env
VITE_BACKEND_URL=http://localhost:3000
```

**Simulator**

```bash
cd ../simulator
pip install -r requirements.txt
```

---

## ⚡ Running the Application

Run each in a separate terminal:

```bash
# 1. Backend API (port 3000)
cd backend && node server.js

# 2. Frontend dashboard (Vite, port 5173)
cd frontend && npm run dev

# 3. Satellite simulator
cd simulator && python simsat.py
```

---

## 📡 API Reference

### `POST /api/satellite/upload`

Submit a satellite frame for processing.

- **Content-Type:** `multipart/form-data`
- **Payload:** `image` (`.png`, `.jpg`, `.gif`)

```json
{
  "message": "Image processed and database updated successfully.",
  "image_url": "http://localhost:3000/uploads/satellite-1790355.gif"
}
```

### `GET /api/cyclones`

Fetch active cyclones.

```json
[
  {
    "id": "c101",
    "name": "Cyclone Amphan",
    "region": "Bay of Bengal",
    "wind_speed": "120 km/h",
    "central_pressure": "980 hPa",
    "status": "Rapid Monitoring",
    "destructive_scale": "Very Severe Cyclonic Storm"
  }
]
```

### `GET /api/alerts/region?lat=<lat>&lon=<lon>`

Location-based risk alert, e.g. `?lat=13.0827&lon=80.2707`.

---

## 📊 Database Schema

**`cyclones`**: active cyclone metadata

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID (PK) | |
| `name` | TEXT | |
| `region` | TEXT | |
| `wind_speed` | NUMERIC | |
| `status` | TEXT | `Monitoring` / `Rapid Monitoring` |

**`cyclone_tracking`**: point-in-time telemetry for path tracing

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID (PK) | |
| `cyclone_id` | UUID (FK → `cyclones.id`) | |
| `recorded_at` | TIMESTAMP | |
| `latitude` | NUMERIC | |
| `longitude` | NUMERIC | |
| `destructive_scale` | TEXT | IMD category |

---



Submitted for **Smart India Hackathon (SIH) 2026**.
