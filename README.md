# TURBA — Smarter Agriculture, Stronger Communities

Where Earth Observation Meets the Wisdom of Farmers.

TURBA is an agricultural decision-support platform developed for the NASA Space Apps Challenge 2026. It brings together geospatial information, environmental data, soil insights, and agricultural science to help farmers better understand their land and make more informed farming decisions.

Our goal is to make complex environmental information more accessible and meaningful for agriculture — supporting smarter water management, more informed irrigation decisions, and more sustainable land-use practices.

 The Idea Behind TURBA
For generations, farmers have relied on their knowledge of the land, the stars, the winds, the clouds, and the seasons to guide their agricultural decisions.

Today, changing climate patterns and increasingly unpredictable environmental conditions make these decisions more challenging.

TURBA was created to connect traditional agricultural wisdom with the wider perspective of Earth observation and digital technology.

We believe technology should not replace farmers' experience. It should help them understand their land through better access to environmental information and scientific insights.

Key Project Focus

TURBA explores several interconnected areas of agricultural decision support:
- 🗺️ Agricultural Mapping: Interactive geographical exploration using Google Maps Platform.
- 🌦️ Environmental Insights: Access to climate and weather information to help users understand environmental conditions.
- 🌱 Soil Awareness: Incorporating soil-property information and soil-related indicators into agricultural analysis.
- 💧 Water Management: Applying agricultural water calculations to support more informed irrigation decisions.
- 🌍 Sustainable Agriculture: Encouraging responsible resource management and long-term agricultural resilience.

Data Sources & Scientific Foundations

TURBA combines environmental information from several sources with established agricultural calculation methods.

Environmental and Geospatial Data
- "NASA POWER" (https://power.larc.nasa.gov/): Climate and environmental parameters, including temperature, humidity, rainfall, solar radiation, wind, and soil-moisture-related indicators.
- "Open-Meteo" (https://open-meteo.com/): Weather forecasts and model-based environmental data.
- "ISRIC SoilGrids" (https://soilgrids.org/): Spatial estimates of soil properties.
- "Copernicus Data Space Ecosystem" (https://dataspace.copernicus.eu/): Sentinel-2 satellite imagery catalog information and metadata.

Scientific Methods

- FAO-56: Reference evapotranspiration and crop-water-requirement calculations.
- Saxton & Rawls (2006): Soil hydraulic property estimation.
- USDA NRCS Curve Number Method: Rainfall-runoff estimation.
Data Transparency: Environmental APIs, model-based estimates, satellite catalog metadata, and static reference datasets represent different types of information. TURBA aims to distinguish between them rather than presenting every value as a direct field measurement.


 Agricultural Calculation Methods

The platform incorporates agricultural and environmental calculations, including:
- FAO-56 Penman–Monteith methodology for reference evapotranspiration (ET₀).
- Crop coefficients (Kc) and crop evapotranspiration (ETc).
- Soil-water-balance calculations.
- Total Available Water (TAW) and Readily Available Water (RAW).
- Crop water-stress considerations.
- Soil-property estimation using Saxton and Rawls pedotransfer functions.
- Rainfall-runoff estimation using the USDA Curve Number method.

These methods provide a scientific foundation for interpreting environmental conditions and supporting agricultural decisions.

 Technologies Used

TURBA is built using modern web technologies:

- TypeScript: Primary programming language.
- React: User interface development.
- Vite: Development server and build tooling.
- Node.js: JavaScript runtime.
- Express.js: Backend services.
- Tailwind CSS: Interface styling.
- Google Maps Platform: Interactive geographical mapping.

 Getting Started

Follow these steps to run TURBA locally.
Prerequisites
Make sure you have installed:

- "Node.js" (https://nodejs.org/)
- npm
- Git

1. Clone the Repository
git clone https://github.com/atibsso500-b/Torba-.-Nasa.git

2. Navigate to the Project Directory
cd Torba-.-Nasa

3. Install Dependencies
npm install

4. Configure Environment Variables
Create your local environment file using the provided example:

cp .env.example .env
Add your Google Maps API key to the appropriate environment variable specified in ".env.example".
Important: Keep your API keys private. Never commit your ".env" file or expose secret credentials in your repository.

5. Start the Development Server
npm run dev

6. Build the Project
npm run build

7. Run the TypeScript Check
npm run lint


 Our Vision

We envision a future in which farmers can make better-informed decisions through accessible environmental data, agricultural science, and digital innovation.
Water is more than a natural resource. Soil is more than a surface beneath our feet. Both are essential to livelihoods, food security, and the future of communities.
TURBA aims to help bridge the gap between global Earth observation and local agricultural needs — making environmental information more useful for the people who depend on the land every day.
«We are not building technology to replace the farmer's wisdom. We are building technology to give that wisdom a wider view of the Earth.»


 Project Information

- Project: TURBA
- Competition: NASA Space Apps Challenge 2026
- Category: Agricultural Technology / Earth Observation / Sustainability
- Development: Team TURBA

  
<p align="center">
  <strong>TURBA — Smarter Agriculture, Stronger Communities.</strong><br/>
  <em>Connecting the wisdom of farmers with the power of Earth observation.</em>
</p>
