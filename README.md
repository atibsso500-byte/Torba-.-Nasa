<div align="center">

# TURBA — Smarter Agriculture, Stronger Communities


**TURBA** is an explainable agricultural decision-support platform developed for the **NASA Space Apps Challenge 2026**. It bridges the gap between multi-source satellite Earth observation, agronomic physics, and local farming reality—turning complex geospatial datasets into actionable, multi-season crop and water strategies.

</div>


## What Sets TURBA Apart From Other Agricultural & Space Apps?

Unlike conventional agricultural dashboards that merely display raw weather charts or offer single-season crop guesses, **TURBA** introduces a fundamentally deeper approach to climate-smart farming:

1. **Living "Land Memory" (`src/services/memory/`)**
   Most apps treat every farm query as an isolated event. TURBA features a dedicated **Land Memory** engine that records a field's identity, historical crop seasons, soil evolution, and farmer feedback—allowing recommendations to adapt and learn from the actual history of the land over time.
2. **Multi-Season Strategic Rotation (3–4 Seasons) vs. Single-Season Guessing**
   Instead of short-term, single-crop suggestions that risk soil depletion, TURBA’s **Rotation Engine** (`rotationEngine.ts`) plans **3 to 4 consecutive seasons**. It balances botanical families, root depths, soil nutrient recovery, and pest-cycle breaking.
3. **Three Strategic Pathways & Farmer Autonomy**
   Technology should empower—not dictate. TURBA presents farmers with **three distinct strategic trajectories** (*Balanced*, *Conservative*, and *Water-Saving*). Furthermore, the farmer remains the ultimate decision-maker: if a farmer rejects a crop or marks it unavailable locally, TURBA dynamically recalculates the entire multi-season pathway.
4. **Radical Scientific Transparency & Data Provenance (`provenance.ts`)**
   Many platforms falsely present coarse satellite estimates as exact field measurements or promise unrealistic profits. TURBA implements strict **Data Provenance**, explicitly distinguishing between direct satellite observations, spatial models, and static reference tables—stating scientific limitations and spatial resolution boundaries upfront.
5. **Built for Real-World Economic & Hardware Constraints**
   TURBA does not assume smallholder farmers own expensive IoT soil probes or automated smart pumps. Its water-balance and rotation algorithms adapt directly to the farmer's **actual budget, available water supply, and existing irrigation setup**.


## The Idea Behind TURBA

For generations, farmers have relied on their deep intuition of the land, winds, clouds, and seasons. Today, accelerating climate volatility and water scarcity make relying on traditional intuition alone increasingly risky.

**TURBA** connects ancestral agricultural wisdom with modern Earth observation. We are not building technology to replace the farmer's wisdom—we are building technology to give that wisdom a wider view of the Earth.


## Core Platform Capabilities

- **Interactive Farm Mapping (`FarmMap.tsx`):** Precise field boundary mapping and regional agro-climatic profiling powered by Google Maps Platform.
- **Physics-Based Irrigation Engine (`src/services/irrigation/`):** Daily soil-water balance modeling, deficit tracking, and irrigation scheduling tailored to local crop stages.
- **Intelligent Crop Rotation Advisor (`rotationAdvisor.ts`):** Multi-criteria evaluation scoring crops across water stress, soil compatibility, economic feasibility, and seasonal continuity.
- **Land Memory & Futures Simulation (`Timeline.tsx`, `Futures.tsx`):** Track past seasonal performance, inspect scientific evidence (`Evidence.tsx`), and simulate future climate scenarios (`Predictions.tsx`).
- **Multilingual Accessibility (`src/i18n/`):** Designed for inclusive adoption across diverse farming communities.
## Platform Preview
"(https://drive.google.com/drive/folders/1aIZ7Xg2gi2XRr5Amyaj5IQyCs_VbNZnr)"

## Data Sources & Scientific Foundations

TURBA synthesizes environmental data from four authoritative global platforms with peer-reviewed agronomic equations:

### Geospatial & Environmental APIs
- **[NASA POWER](https://nasa.gov):** Solar radiation, temperature, relative humidity, wind speed, precipitation, and agro-climatological indicators.
- **[ISRIC SoilGrids](https://soilgrids.org):** Global spatial estimates of soil texture (sand, silt, clay), organic carbon, and bulk density.
- **[Copernicus Data Space Ecosystem](https://copernicus.eu):** Sentinel-2 satellite imagery metadata and spectral vegetation indicators.
- **[Open-Meteo](https://open-meteo.com):** High-resolution weather forecasts and historical meteorological reanalysis.

### Agronomic & Hydrological Models
- **FAO-56 Penman–Monteith (`fao56.ts`):** Reference evapotranspiration (ET₀), crop coefficients (\(K_c\)), and actual crop evapotranspiration (\(ET_c\)).
- **Soil-Water Balance (`waterBalance.ts`):** Total Available Water (TAW), Readily Available Water (RAW), and root-zone water stress thresholds.
- **Saxton & Rawls (2006) (`soil.ts`):** Pedotransfer functions for estimating soil hydraulic properties (field capacity, wilting point, saturated conductivity).
- **USDA NRCS Curve Number (`rainfall.ts`):** Effective rainfall and surface runoff estimation.


## Project Architecture

```text
Torba-.-Nasa/
├── server.ts                  # Express backend & API proxy services
├── src/
│   ├── components/
│   │   ├── irrigation/        # IrrigationPanel, RotationPanel, WaterChart
│   │   ├── memory/            # MemoryDashboard, Timeline, Evidence, Futures, Predictions
│   │   └── ...                # Dashboard, FarmMap, FarmProfile, DataSources, SystemStatus
│   ├── services/
│   │   ├── irrigation/        # FAO-56, WaterBalance, Soil hydraulics, RotationEngine
│   │   ├── memory/            # Land Memory service, Provenance tracking, Validation
│   │   └── ...                # NASA POWER, Copernicus, Earth Engine, Cache
│   ├── data/                  # Crop parameters, regional boundaries & agro-zones
│   └── i18n/                  # Multilingual translation support
├── scripts/                   # Verification & phase testing scripts
└── tests/                     # Automated unit & integration tests (Vitest)
```


## Technologies Used

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express.js
- **Geospatial & Mapping:** Google Maps Platform
- **Testing & Verification:** Vitest & custom agronomic validation scripts



## Getting Started

Follow these steps to run **TURBA** locally on your machine.

### Prerequisites
- [Node.js](https://nodejs.org) (v18 or higher recommended)
- `npm` and `Git`

### 1. Clone the Repository
```bash
git clone https://github.com/atibsso500-byte/Torba-.-Nasa.git
cd Torba-.-Nasa
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create your local `.env` file from the provided template:
```bash
cp .env.example .env
```
Add your required API keys (such as your Google Maps API key) inside `.env`.  
> **Security Note:** Never commit your `.env` file or expose private API credentials in the repository.

### 4. Start the Development Server
```bash
npm run dev
```

### 5. Run Tests & TypeScript Checks
```bash
npm test
npm run lint
```

## Our Vision

Water is more than a natural resource. Soil is more than a surface beneath our feet. Both are the foundation of livelihoods, food security, and resilient communities.

**TURBA** aims to bridge the gap between orbital Earth observation and everyday agricultural reality—ensuring that space data serves the people who nurture the land.

> *"We are not building technology to replace the farmer's wisdom. We are building technology to give that wisdom a wider view of the Earth."*


## Competition Details

- **Project Name:** TURBA
- **Event:** NASA Space Apps Challenge 2026
- **Domain:** Earth Observation / Climate-Smart Agriculture / Sustainable Water Management
- **Team:** Atlas AgroSpace


<p align="center">
  <strong>TURBA — Smarter Agriculture, Stronger Communities.</strong><br/>
  <em>Connecting the wisdom of farmers with the power of Earth observation.</em>
</p>
