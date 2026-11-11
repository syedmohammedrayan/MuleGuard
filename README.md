# MuleGuard

Graph-Based Financial Forensics & Money Muling Detection

MuleGuard is a graph-based financial forensics and money muling detection application. It transforms raw transaction logs into directed graphs and applies graph theory algorithms to detect circular fund routing, smurfing patterns (fan-in and fan-out), and multi-hop shell account networks commonly used in money laundering operations.

---

## Architecture

MuleGuard employs a decoupled client–server architecture operating entirely locally:

```
┌──────────────────────────────────────────┐
│           React Frontend (Vite)          │
│          http://127.0.0.1:8080           │
│  - Interactive 2D Force-Directed Graph   │
│  - Account & Ring Detail Panels          │
│  - Forensic Analytics & Pattern Dashboards│
│  - JSON Report Export                    │
└────────────────────┬─────────────────────┘
                     │ HTTP (REST)
                     ▼
┌──────────────────────────────────────────┐
│          FastAPI Python Backend          │
│          http://127.0.0.1:8001           │
│  - Ingestion & CSV Parsing               │
│  - NetworkX Directed Graph Construction  │
│  - Detection Passes (Cycles, Smurfing,   │
│    Shell Networks)                       │
│  - Risk Scoring & Ring Aggregation       │
└──────────────────────────────────────────┘
```

1. **Ingestion Layer:** Parses transaction CSV files, normalizes timestamps and accounts, and builds a directed graph (`nx.DiGraph`).
2. **Forensic Analysis Engine:** Executes specialized detection passes:
   - **Circular Routing (Cycles):** Depth-limited DFS (depths 3–5) to identify closed loops.
   - **Smurfing Patterns:** 72-hour sliding window analysis identifying rapid fund aggregation (fan-in >= 3) and dispersion (fan-out >= 3).
   - **Shell Account Networks:** 3-hop chain analysis filtering for low-degree intermediate passthrough nodes.
3. **Scoring Engine:** Calculates suspicion scores (0–100) based on weighted pattern hits and member counts.
4. **Visualization Layer:** Renders canvas-based interactive force-directed graphs with real-time node dragging, clustering, and forensic inspection.

---

## Technology Stack

### Backend
- **Python 3.10+**
- **FastAPI** — High-performance asynchronous web framework
- **Uvicorn** — ASGI web server
- **NetworkX** — Graph theory data structures and cycle algorithms
- **Pandas** — High-performance tabular data ingestion and manipulation
- **python-multipart** — Streaming CSV file uploads

### Frontend
- **React 18** & **TypeScript**
- **Vite** — Fast frontend build tool and development server
- **Tailwind CSS** & **shadcn/ui** — Modern forensic user interface
- **react-force-graph-2d** — Canvas-based force-directed 2D network visualization
- **Framer Motion** & **Lucide React** — Animations and UI iconography
- **Axios** — HTTP client communicating with the local FastAPI backend

---

## Implemented Features

- **CSV Transaction Ingestion:** Upload and parse transaction logs with schema validation.
- **Circular Routing Detection:** Discovers cycles of lengths 3, 4, and 5 indicating looped funds.
- **Smurfing Detection:** Discovers fan-in (aggregation from multiple sources) and fan-out (rapid dispersion) within a 72-hour window.
- **Layered Shell Account Detection:** Identifies passthrough chains (pred -> shell1 -> shell2 -> succ).
- **Suspicion Scoring:** Scores accounts from 0 to 100 based on pattern involvement.
- **Fraud Ring Identification:** Groups suspicious accounts into labeled fraud rings with risk scores.
- **Interactive Force Graph:** Dynamic graph visualization supporting node selection, risk coloring, and cluster zooming.
- **Account & Ring Inspection:** Side panel displaying in-depth metrics, neighbor connections, and flagged patterns.
- **Multi-View Analytics:**
  - **Overview / Forensics Dashboard:** Upload, graph viewer, and ring summaries.
  - **Transactions View:** Paginated, filterable tabular transaction view.
  - **Patterns View:** Breakdown of circular routing, smurfing, and shell chains.
  - **Analytics View:** Risk distribution charts, volume breakdowns, and score distributions.
  - **Settings View:** Local threshold toggles and configuration parameters.
- **Client-Side Fallback Engine:** Built-in client-side fallback analysis ensures forensic exploration continues even if the backend is temporarily unreachable.
- **Demo / Synthetic Data:** Instant preview using built-in synthetic datasets.
- **JSON Export:** Download full forensic audit reports as structured JSON.

---

## Project Structure

```
C:\MuleGuard\
├── .gitignore                  # Git ignore rules for Python, Node, and OS files
├── LICENSE                     # MIT License (Harsh Kumar)
├── README.md                   # Project documentation
├── convert_data.py             # Utility for converting PaySim datasets
├── fraud_test.csv              # Synthetic test transactions dataset
├── money-mulling.csv           # Sample money muling dataset
├── start_app.bat               # Windows double-click launcher
├── backend/
│   ├── main.py                 # FastAPI application & graph detection engine
│   └── requirements.txt        # Python backend dependencies
└── frontend/
    ├── package.json            # Node dependencies and scripts
    ├── package-lock.json       # Deterministic npm dependency lockfile
    ├── tsconfig.json           # TypeScript configuration
    ├── vite.config.ts          # Vite build and server configuration
    ├── index.html              # Frontend HTML entry point
    └── src/
        ├── App.tsx             # Root React component and routing
        ├── main.tsx            # React application entry point
        ├── index.css           # Global Tailwind CSS styles
        ├── components/         # UI & visualization components
        ├── context/            # MuleContext state management
        ├── hooks/              # Custom React hooks (useMuleAnalysis)
        ├── pages/              # Index, Patterns, Analytics, Transactions, Settings
        └── services/           # api.ts (backend client)
```

---

## Prerequisites

- **Python:** 3.10 or higher
- **Node.js:** 18.0.0 or higher
- **npm:** 9.0.0 or higher

---

## Installation & Setup

### 1. Python Backend

Create and activate a virtual environment, then install dependencies:

```powershell
# Create virtual environment at root
python -m venv .venv

# Activate on Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# Or Windows (CMD):
.\.venv\Scripts\activate.bat

# Install dependencies:
pip install -r backend/requirements.txt
```

### 2. Frontend

Install frontend dependencies using npm:

```powershell
cd frontend
npm ci
cd ..
```

---

## Running Locally

### Quick Start (Windows)

Double-click `start_app.bat` or run from PowerShell:

```powershell
.\start_app.bat
```

This script detects `.venv`, verifies frontend dependencies, and launches both the backend and frontend in separate console windows.

### Manual Launch

**Terminal 1 — Backend:**
```powershell
python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8001
```

**Terminal 2 — Frontend:**
```powershell
cd frontend
npm run dev
```

---

## Local Service Addresses

| Service | URL | Description |
|---|---|---|
| **Frontend UI** | `http://127.0.0.1:8080` | Interactive forensic web application |
| **Backend API** | `http://127.0.0.1:8001` | FastAPI REST service |
| **Interactive API Docs** | `http://127.0.0.1:8001/docs` | Swagger UI documentation |
| **Alternative OpenAPI Docs** | `http://127.0.0.1:8001/redoc` | ReDoc API documentation |

---

## Expected CSV Format

Transaction files must be uploaded in CSV format with the following header columns:

| Column | Type | Description | Example |
|---|---|---|---|
| `transaction_id` | String | Unique transaction identifier | `TX_1001` |
| `sender_id` | String | Originating account ID | `ACC_SENDER_1` |
| `receiver_id` | String | Beneficiary account ID | `ACC_RECEIVER_2` |
| `amount` | Float / Int | Transaction currency amount | `45000.00` |
| `timestamp` | Datetime / Int | Transaction time (`YYYY-MM-DD HH:MM:SS` or Unix epoch) | `2024-01-15 14:30:00` |

Sample datasets `fraud_test.csv` and `money-mulling.csv` are included in the repository.

---

## Known Technical Limitations

1. **Fixed Temporal Windows:** Smurfing detection currently uses a fixed 72-hour sliding window.
2. **In-Memory Graph Processing:** The NetworkX directed graph is held in memory during the request. Datasets with millions of transactions should be pre-filtered or batched.
3. **Local Loopback Operation:** Configured by default for local loopback (`127.0.0.1`) without external cloud dependencies.

---

## License

This project is licensed under the [MIT License](LICENSE).

Original implementation authored by Harsh Kumar. Maintained locally as MuleGuard.
