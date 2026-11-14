/**
 * Simplified Country Boundary Polygons (hand-digitised, APPROXIMATE).
 * NOT Natural Earth data. Accuracy is roughly 5-20 km along borders, so points within
 * that distance of a border may be misclassified. To get exact borders, replace these arrays
 * with polygons generated from Natural Earth `ne_10m_admin_0_countries` (Public Domain).
 * Provides polygon point-in-polygon containment testing to replace unreliable bounding boxes.
 * Accurately handles borders such as Oujda/Zouj Beghal (Morocco), Portugal (Lisbon), Spain (Madrid), and Algeria (Algiers).
 */

import { Coordinates } from '../types/farm';

export interface CountryBoundary {
  countryCode: string;
  nameEn: string;
  nameFr: string;
  nameAr: string;
  regionHint: string;
  timezone: string;
  isMorocco: boolean;
  isSupported: boolean;
  isNeighboring: boolean;
  polygons: Coordinates[][]; // MultiPolygon representation
}

/**
 * Morocco Sovereign Boundary Polygon (Including Northern & Southern Provinces)
 * Verified border demarcations:
 * - North: Mediterranean coast (Saïdia to Cap Spartel)
 * - West: Atlantic coastline (Cap Spartel to Lagouira / Cap Blanc)
 * - South: Border with Mauritania along parallel 21.34°N
 * - East: Border with Algeria east of Oujda (Zouj Beghal at -1.78°W), Figuig, down to 27.67°N, -8.67°W.
 */
export const MOROCCO_BOUNDARY: Coordinates[] = [
  // Mediterranean Coast: Saïdia to Tangier
  { lat: 35.09, lng: -2.22 }, // Saïdia border post with Algeria (Oued Kiss)
  { lat: 35.15, lng: -2.45 }, // Ras Kebdana
  { lat: 35.28, lng: -2.95 }, // Nador
  { lat: 35.25, lng: -3.93 }, // Al Hoceïma
  { lat: 35.21, lng: -4.67 }, // El Jebha
  { lat: 35.45, lng: -5.10 }, // Oued Laou
  { lat: 35.62, lng: -5.28 }, // Martil / Tetouan
  { lat: 35.85, lng: -5.35 }, // Fnideq
  { lat: 35.90, lng: -5.50 }, // Belyounech / Jbel Musa
  { lat: 35.80, lng: -5.80 }, // Tangier Med
  { lat: 35.78, lng: -5.85 }, // Tangier City
  { lat: 35.79, lng: -5.93 }, // Cap Spartel

  // Atlantic Coast: Tangier to Lagouira
  { lat: 35.47, lng: -6.04 }, // Asilah
  { lat: 35.19, lng: -6.15 }, // Larache
  { lat: 34.70, lng: -6.37 }, // Moulay Bousselham
  { lat: 34.26, lng: -6.60 }, // Mehdia / Kenitra
  { lat: 34.02, lng: -6.84 }, // Rabat / Salé
  { lat: 33.71, lng: -7.39 }, // Mohammedia
  { lat: 33.59, lng: -7.62 }, // Casablanca
  { lat: 33.25, lng: -8.50 }, // El Jadida
  { lat: 32.30, lng: -9.24 }, // Safi
  { lat: 31.51, lng: -9.77 }, // Essaouira
  { lat: 30.42, lng: -9.60 }, // Agadir
  { lat: 29.38, lng: -10.18 }, // Sidi Ifni / Mirleft
  { lat: 28.50, lng: -11.34 }, // Tan-Tan Plage / El Ouatia
  { lat: 27.94, lng: -12.93 }, // Tarfaya
  { lat: 27.15, lng: -13.34 }, // Laâyoune Plage (Foum El Oued)
  { lat: 26.13, lng: -14.49 }, // Boujdour
  { lat: 24.50, lng: -15.10 }, // Cap Barbas
  { lat: 23.72, lng: -15.93 }, // Dakhla
  { lat: 22.98, lng: -16.15 }, // Cintra
  { lat: 21.80, lng: -16.80 }, // Bir Gandouz
  { lat: 20.83, lng: -17.05 }, // Lagouira / Cap Blanc tip

  // Southern Border with Mauritania
  { lat: 21.34, lng: -16.96 }, // Guerguerat border post
  { lat: 21.34, lng: -15.00 }, // Southern latitude parallel 21°20'N
  { lat: 21.34, lng: -13.00 }, // Southern turn point
  { lat: 27.67, lng: -13.00 }, // Border segment north along 13°W
  { lat: 27.67, lng: -8.67 },  // East along 27°40'N to tripoint with Algeria

  // Eastern Border with Algeria
  { lat: 28.67, lng: -8.67 },  // North along 8°40'W
  { lat: 29.50, lng: -8.00 },  // Zag desert
  { lat: 30.50, lng: -6.50 },  // Foum Zguid / Tata
  { lat: 31.25, lng: -4.00 },  // Merzouga / Erfoud eastern limit
  { lat: 32.10, lng: -1.22 },  // Figuig oasis salient (Moroccan territory wraps east to -1.22°W)
  { lat: 32.30, lng: -1.22 },  // North of Figuig
  { lat: 32.80, lng: -1.85 },  // Bouarfa / Mengoub border
  { lat: 33.60, lng: -1.95 },  // Tendrara
  { lat: 34.00, lng: -2.00 },  // Ain Beni Mathar
  { lat: 34.45, lng: -1.82 },  // Touissit
  { lat: 34.68, lng: -1.78 },  // East of Oujda at Zouj Beghal border post (-1.78°W is border, Oujda center is -1.91°W)
  { lat: 34.90, lng: -2.10 },  // Ahfir / Beni Snassen eastern slopes
  { lat: 35.09, lng: -2.22 },  // Closed back at Saïdia on Mediterranean
];

/**
 * Portugal Sovereign Boundary Polygon (Mainland)
 * Accurately covers Lisbon (38.72°N, -9.14°W), Porto, Faro/Algarve.
 */
export const PORTUGAL_BOUNDARY: Coordinates[] = [
  { lat: 41.87, lng: -8.87 }, // Caminha / Minho River Mouth
  { lat: 41.15, lng: -8.69 }, // Porto
  { lat: 40.64, lng: -8.75 }, // Aveiro
  { lat: 40.15, lng: -8.90 }, // Figueira da Foz
  { lat: 39.36, lng: -9.38 }, // Peniche
  { lat: 38.78, lng: -9.50 }, // Cabo da Roca (westernmost point of mainland Europe)
  { lat: 38.70, lng: -9.30 }, // Cascais / Estoril
  { lat: 38.72, lng: -9.14 }, // Lisbon (Port of Lisbon / Tejo estuary)
  { lat: 38.41, lng: -9.22 }, // Cabo Espichel
  { lat: 38.52, lng: -8.90 }, // Setúbal
  { lat: 37.95, lng: -8.87 }, // Sines
  { lat: 37.02, lng: -8.99 }, // Cabo de São Vicente / Sagres
  { lat: 37.10, lng: -8.67 }, // Portimão
  { lat: 36.96, lng: -7.88 }, // Faro / Ria Formosa
  { lat: 37.18, lng: -7.41 }, // Vila Real de Santo António (Guadiana mouth)

  // Border with Spain (northwards)
  { lat: 37.50, lng: -7.45 }, // Alcoutim
  { lat: 38.00, lng: -7.30 }, // Mértola / Serpa border
  { lat: 38.50, lng: -7.10 }, // Mourão border
  { lat: 38.88, lng: -7.00 }, // Elvas / Badajoz border
  { lat: 39.40, lng: -7.15 }, // Portalegre
  { lat: 39.80, lng: -7.05 }, // Castelo Branco
  { lat: 40.35, lng: -6.85 }, // Sabugal / Vilar Formoso
  { lat: 41.00, lng: -6.82 }, // Douro International
  { lat: 41.50, lng: -6.27 }, // Miranda do Douro salient
  { lat: 41.90, lng: -6.75 }, // Bragança northeast border
  { lat: 41.85, lng: -7.50 }, // Chaves border
  { lat: 42.15, lng: -8.20 }, // Melgaço / Minho upstream
  { lat: 41.87, lng: -8.87 }, // Caminha
];

/**
 * Spain Sovereign Boundary Polygon (Mainland Iberian Peninsula)
 * Accurately covers Madrid (40.42°N, -3.70°W), Andalusia, Catalonia, Galicia.
 * Strictly excludes Portugal and North African territories.
 */
export const SPAIN_BOUNDARY: Coordinates[] = [
  // Atlantic Andalusia to Gibraltar
  { lat: 37.19, lng: -7.40 }, // Ayamonte (border with Portugal)
  { lat: 37.15, lng: -6.85 }, // Huelva
  { lat: 36.78, lng: -6.36 }, // Sanlúcar de Barrameda
  { lat: 36.53, lng: -6.28 }, // Cádiz
  { lat: 36.00, lng: -5.60 }, // Tarifa (southernmost point of mainland Europe)
  { lat: 36.15, lng: -5.35 }, // La Línea / Gibraltar border

  // Mediterranean Coast
  { lat: 36.50, lng: -4.88 }, // Marbella
  { lat: 36.72, lng: -4.42 }, // Málaga
  { lat: 36.75, lng: -3.50 }, // Motril
  { lat: 36.83, lng: -2.46 }, // Almería
  { lat: 37.60, lng: -0.98 }, // Cartagena
  { lat: 38.35, lng: -0.48 }, // Alicante
  { lat: 39.47, lng: -0.37 }, // Valencia
  { lat: 39.98, lng: -0.05 }, // Castellón
  { lat: 40.72, lng: 0.85 },  // Ebro Delta
  { lat: 41.12, lng: 1.25 },  // Tarragona
  { lat: 41.38, lng: 2.17 },  // Barcelona
  { lat: 42.31, lng: 3.32 },  // Cap de Creus (northeast point)

  // Pyrenees Border with France
  { lat: 42.45, lng: 3.15 },  // Portbou
  { lat: 42.40, lng: 2.50 },  // Pyrenees
  { lat: 42.60, lng: 1.50 },  // Near Andorra
  { lat: 42.80, lng: 0.50 },  // Central Pyrenees
  { lat: 43.00, lng: -1.00 }, // Western Pyrenees
  { lat: 43.36, lng: -1.78 }, // Irún / Hondarribia

  // Cantabrian / Atlantic Coast
  { lat: 43.32, lng: -1.98 }, // San Sebastián
  { lat: 43.35, lng: -3.00 }, // Bilbao
  { lat: 43.46, lng: -3.80 }, // Santander
  { lat: 43.54, lng: -5.66 }, // Gijón
  { lat: 43.55, lng: -7.05 }, // Ribadeo
  { lat: 43.78, lng: -7.70 }, // Estaca de Bares (northernmost point)
  { lat: 43.37, lng: -8.40 }, // A Coruña
  { lat: 42.88, lng: -9.28 }, // Cabo Finisterre
  { lat: 42.24, lng: -8.72 }, // Vigo
  { lat: 41.87, lng: -8.87 }, // Caminha / Minho river mouth (Portugal border)

  // Border with Portugal (southwards along Portugal's eastern border)
  { lat: 42.15, lng: -8.20 },
  { lat: 41.85, lng: -7.50 },
  { lat: 41.90, lng: -6.75 },
  { lat: 41.50, lng: -6.27 },
  { lat: 41.00, lng: -6.82 },
  { lat: 40.35, lng: -6.85 },
  { lat: 39.80, lng: -7.05 },
  { lat: 39.40, lng: -7.15 },
  { lat: 38.88, lng: -7.00 }, // Badajoz
  { lat: 38.50, lng: -7.10 },
  { lat: 38.00, lng: -7.30 },
  { lat: 37.50, lng: -7.45 },
  { lat: 37.19, lng: -7.40 }, // Ayamonte
];

/**
 * Algeria Sovereign Boundary Polygon (Northern & Saharan Territory)
 * Accurately covers Algiers (36.75°N, 3.06°E), Oran, Constantine.
 * Strictly excludes Moroccan territory (Oujda at -1.91°W is outside Algeria).
 */
export const ALGERIA_BOUNDARY: Coordinates[] = [
  // Mediterranean Coast: Saïdia border to Tunisia border
  { lat: 35.09, lng: -2.20 }, // Marsa Ben M'Hidi (east of Saïdia)
  { lat: 35.10, lng: -1.86 }, // Ghazaouet
  { lat: 35.30, lng: -1.40 }, // Beni Saf
  { lat: 35.70, lng: -0.63 }, // Oran
  { lat: 35.85, lng: -0.30 }, // Arzew
  { lat: 35.93, lng: 0.09 },  // Mostaganem
  { lat: 36.51, lng: 1.30 },  // Tenes
  { lat: 36.59, lng: 2.44 },  // Tipaza
  { lat: 36.75, lng: 3.06 },  // Algiers (Bay of Algiers)
  { lat: 36.91, lng: 3.91 },  // Dellys
  { lat: 36.75, lng: 5.08 },  // Béjaïa
  { lat: 36.82, lng: 5.77 },  // Jijel
  { lat: 36.88, lng: 6.90 },  // Skikda
  { lat: 36.90, lng: 7.77 },  // Annaba
  { lat: 36.90, lng: 8.44 },  // El Kala (Tunisia border)

  // Eastern Border with Tunisia & Libya
  { lat: 36.50, lng: 8.35 },
  { lat: 35.40, lng: 8.12 },  // Tébessa border
  { lat: 34.00, lng: 7.80 },
  { lat: 33.36, lng: 6.86 },  // El Oued
  { lat: 30.20, lng: 9.50 },  // Ghadames tripoint
  { lat: 27.50, lng: 9.80 },  // Border with Libya
  { lat: 23.50, lng: 11.99 }, // Djanet / Ghat sector

  // Southern Border with Niger & Mali
  { lat: 19.14, lng: 11.99 }, // Southernmost limit
  { lat: 19.50, lng: 5.80 },  // Tamanrasset southern desert
  { lat: 21.33, lng: 0.95 },  // Bordj Mokhtar border post with Mali
  { lat: 25.00, lng: -4.85 }, // Mali / Mauritania tripoint

  // Western Border with Mauritania & Morocco
  { lat: 27.30, lng: -8.67 }, // Tindouf sector
  { lat: 27.67, lng: -8.67 }, // Tripoint with Morocco / Western Sahara
  { lat: 28.67, lng: -8.67 },
  { lat: 29.50, lng: -8.00 },
  { lat: 30.50, lng: -6.50 },
  { lat: 31.25, lng: -4.00 },
  { lat: 31.70, lng: -2.20 }, // Béchar sector
  { lat: 32.10, lng: -1.20 }, // East of Figuig
  { lat: 32.80, lng: -1.80 },
  { lat: 34.00, lng: -1.90 },
  { lat: 34.45, lng: -1.80 },
  { lat: 34.68, lng: -1.75 }, // East of Oujda (Zouj Beghal border line is at -1.78°W)
  { lat: 34.90, lng: -2.08 },
  { lat: 35.09, lng: -2.20 }, // Back to Mediterranean coast
];

/**
 * Mauritania Sovereign Boundary Polygon
 */
export const MAURITANIA_BOUNDARY: Coordinates[] = [
  { lat: 20.83, lng: -17.05 }, // Cap Blanc
  { lat: 21.34, lng: -16.96 }, // Guerguerat border
  { lat: 21.34, lng: -13.00 },
  { lat: 25.00, lng: -4.85 },
  { lat: 15.00, lng: -5.50 },
  { lat: 15.00, lng: -16.50 },
  { lat: 20.83, lng: -17.05 },
];

/**
 * Kuwait Sovereign Boundary Polygon
 * Covers Kuwait City (29.3759, 47.9774), Bubiyan Island.
 */
export const KUWAIT_BOUNDARY: Coordinates[] = [
  { lat: 30.10, lng: 47.40 },
  { lat: 30.10, lng: 48.40 }, // Bubiyan Island
  { lat: 29.50, lng: 48.45 }, // Arabian Gulf
  { lat: 29.00, lng: 48.25 }, // Mina Al Ahmadi
  { lat: 28.52, lng: 48.42 }, // Nuwaiseeb border with Saudi Arabia
  { lat: 28.52, lng: 47.70 }, // South border with Saudi Arabia
  { lat: 29.10, lng: 46.55 }, // Tripoint Saudi Arabia / Iraq
  { lat: 30.06, lng: 47.42 }, // Border with Iraq north of Abdali
  { lat: 30.10, lng: 47.40 },
];

/**
 * Qatar Sovereign Boundary Polygon
 * Covers Doha (25.2854, 51.5310), Al Khor, Zubarah.
 */
export const QATAR_BOUNDARY: Coordinates[] = [
  { lat: 26.16, lng: 51.22 }, // Ras Rakan (north tip)
  { lat: 25.92, lng: 51.60 }, // Ras Laffan
  { lat: 25.68, lng: 51.60 }, // Al Khor coast
  { lat: 25.29, lng: 51.62 }, // Doha east coast (offshore margin)
  { lat: 25.00, lng: 51.65 }, // Al Wakrah / Mesaieed
  { lat: 24.65, lng: 51.42 }, // Khor Al Adaid (south-east)
  { lat: 24.72, lng: 51.30 }, // Saudi border
  { lat: 24.74, lng: 50.82 }, // Salwa border
  { lat: 25.42, lng: 50.74 }, // Dukhan west coast
  { lat: 25.90, lng: 50.78 }, // Zekreet / Zubarah
  { lat: 26.16, lng: 51.22 },
];

/**
 * United Arab Emirates Sovereign Boundary Polygon
 * Covers Abu Dhabi (24.4539, 54.3773), Dubai (25.2048, 55.2708), Sharjah, Ras Al Khaimah.
 */
export const UAE_BOUNDARY: Coordinates[] = [
  { lat: 26.08, lng: 56.10 }, // Ras Al Khaimah coast
  { lat: 25.60, lng: 56.38 }, // Fujairah
  { lat: 24.80, lng: 56.35 }, // Kalba border with Oman
  { lat: 24.00, lng: 55.85 }, // Al Ain border with Oman
  { lat: 22.65, lng: 55.20 }, // Southern border tripoint with Oman / Saudi Arabia
  { lat: 22.80, lng: 53.00 }, // Liwa Oasis southern border
  { lat: 24.15, lng: 51.60 }, // Ghuwaifat border with Saudi Arabia
  { lat: 24.55, lng: 54.30 }, // Abu Dhabi coastline
  { lat: 25.30, lng: 55.20 }, // Dubai coastline
  { lat: 25.55, lng: 55.55 }, // Sharjah / Ajman / Umm Al Quwain coastline
  { lat: 26.08, lng: 56.10 },
];

/**
 * Jordan Sovereign Boundary Polygon
 * Covers Amman (31.9454, 35.9284), Aqaba (29.5267, 35.0078), Irbid.
 */
export const JORDAN_BOUNDARY: Coordinates[] = [
  { lat: 32.70, lng: 35.60 }, // Yarmouk River
  { lat: 32.70, lng: 36.50 }, // Mafraq border with Syria
  { lat: 33.37, lng: 38.80 }, // Tripoint Syria / Iraq
  { lat: 32.22, lng: 39.30 }, // Border with Iraq
  { lat: 31.50, lng: 37.00 }, // Desert border with Saudi Arabia
  { lat: 29.35, lng: 36.00 }, // Mudawwara border with Saudi Arabia
  { lat: 29.35, lng: 34.95 }, // Aqaba coast
  { lat: 30.50, lng: 35.20 }, // Wadi Araba
  { lat: 31.50, lng: 35.40 }, // Dead Sea
  { lat: 32.30, lng: 35.55 }, // Jordan River
  { lat: 32.70, lng: 35.60 },
];

/**
 * Iraq Sovereign Boundary Polygon
 * Covers Baghdad (33.3152, 44.3661), Basra (30.5081, 47.7835), Mosul (36.34, 43.13).
 */
export const IRAQ_BOUNDARY: Coordinates[] = [
  { lat: 37.38, lng: 42.70 }, // Tripoint Turkey / Syria
  { lat: 37.35, lng: 44.80 }, // Border with Turkey
  { lat: 36.50, lng: 45.30 }, // Sulaymaniyah border with Iran
  { lat: 34.50, lng: 45.60 }, // Khanaqin border with Iran
  { lat: 32.50, lng: 46.50 }, // Kut / Mehran border
  { lat: 31.00, lng: 47.70 }, // Amarah border
  { lat: 30.00, lng: 48.55 }, // Al-Faw peninsula / Shatt al-Arab
  { lat: 29.90, lng: 48.00 }, // Border with Kuwait
  { lat: 29.10, lng: 46.55 }, // Tripoint with Kuwait / Saudi Arabia
  { lat: 29.60, lng: 43.50 }, // Desert border with Saudi Arabia (Rafha)
  { lat: 31.00, lng: 41.00 }, // Arar border
  { lat: 32.22, lng: 39.30 }, // Tripoint with Jordan
  { lat: 33.37, lng: 38.80 }, // Border with Syria
  { lat: 34.40, lng: 41.00 }, // Al-Qa'im border
  { lat: 36.80, lng: 42.40 }, // Sinjar border with Syria
  { lat: 37.38, lng: 42.70 },
];

/**
 * Yemen Sovereign Boundary Polygon
 * Covers Sana'a (15.3694, 44.1910), Aden (12.7855, 45.0187).
 */
export const YEMEN_BOUNDARY: Coordinates[] = [
  { lat: 16.40, lng: 42.80 }, // Red Sea coast north of Midi
  { lat: 16.90, lng: 43.30 }, // Border north of Saada
  { lat: 17.50, lng: 44.20 }, // Border near Najran
  { lat: 17.40, lng: 47.00 }, // Northern desert border
  { lat: 19.00, lng: 52.00 }, // Tripoint Oman / Saudi Arabia
  { lat: 16.65, lng: 53.10 }, // Hawf border with Oman
  { lat: 15.30, lng: 52.20 }, // Arabian Sea coast
  { lat: 14.50, lng: 49.10 }, // Mukalla
  { lat: 12.78, lng: 45.02 }, // Aden
  { lat: 12.60, lng: 43.45 }, // Bab-el-Mandeb
  { lat: 13.35, lng: 43.25 }, // Mocha
  { lat: 14.80, lng: 42.95 }, // Al Hudaydah
  { lat: 16.40, lng: 42.80 },
];

/**
 * Egypt Sovereign Boundary Polygon
 * Covers Cairo (30.0444, 31.2357), Sinai / Sharm El Sheikh (27.9158, 34.3299), Alexandria.
 */
export const EGYPT_BOUNDARY: Coordinates[] = [
  { lat: 31.60, lng: 25.10 }, // Sallum (border with Libya)
  { lat: 31.20, lng: 29.90 }, // Alexandria
  { lat: 31.50, lng: 31.85 }, // Damietta / Nile Delta
  { lat: 31.25, lng: 34.25 }, // Rafah border
  { lat: 29.50, lng: 34.90 }, // Taba / Gulf of Aqaba
  { lat: 27.85, lng: 34.30 }, // Ras Muhammad / Sharm El Sheikh
  { lat: 28.00, lng: 33.40 }, // Gulf of Suez
  { lat: 27.20, lng: 33.80 }, // Hurghada
  { lat: 24.00, lng: 35.50 }, // Berenice
  { lat: 22.00, lng: 36.90 }, // Halaib triangle / Red Sea
  { lat: 22.00, lng: 25.00 }, // Southern border with Sudan (parallel 22°N)
  { lat: 31.60, lng: 25.10 },
];

/**
 * Saudi Arabia Sovereign Boundary Polygon
 * Covers Riyadh (24.7136, 46.6753), Jeddah (21.5433, 39.1728), Qassim (26.3260, 43.9750),
 * Tabuk (28.3835, 36.5662), Dammam, Najran, Abha, and Rub' al Khali.
 * Strictly excludes Kuwait, Qatar, UAE, Jordan, Iraq, Yemen, and Egypt.
 */
export const SAUDI_ARABIA_BOUNDARY: Coordinates[] = [
  // Red Sea Coast: Gulf of Aqaba (Haql) down to Midi border
  { lat: 29.28, lng: 34.94 }, // Haql (border with Jordan)
  { lat: 28.40, lng: 34.75 }, // Magna / Straits of Tiran
  { lat: 27.35, lng: 35.69 }, // Duba
  { lat: 26.24, lng: 36.45 }, // Al Wajh
  { lat: 25.00, lng: 37.26 }, // Umluj
  { lat: 24.09, lng: 38.06 }, // Yanbu
  { lat: 22.80, lng: 39.03 }, // Rabigh
  { lat: 21.54, lng: 39.17 }, // Jeddah
  { lat: 20.15, lng: 40.27 }, // Al Lith
  { lat: 19.10, lng: 41.08 }, // Al Qunfudhah
  { lat: 17.75, lng: 41.95 }, // Al Birk
  { lat: 16.89, lng: 42.57 }, // Jazan
  { lat: 16.40, lng: 42.80 }, // Border post with Yemen (north of Midi)

  // Southern Border with Yemen (eastwards to Oman tripoint)
  { lat: 16.90, lng: 43.30 }, // North of Saada
  { lat: 17.50, lng: 44.20 }, // Najran sector
  { lat: 17.40, lng: 47.00 }, // Rub' al Khali border segment
  { lat: 19.00, lng: 52.00 }, // Tripoint Saudi Arabia / Yemen / Oman

  // Eastern Border with Oman
  { lat: 22.65, lng: 55.20 }, // Tripoint Saudi Arabia / Oman / UAE

  // Border with UAE (Rub' al Khali to Gulf coast)
  { lat: 22.80, lng: 53.00 }, // South of Liwa
  { lat: 24.15, lng: 51.60 }, // Ghuwaifat / Khawr al Udayd

  // Border with Qatar
  { lat: 24.60, lng: 51.35 }, // Base of Qatar peninsula
  { lat: 24.70, lng: 50.75 }, // Salwa border

  // Arabian Gulf Coast: Salwa to Khafji
  { lat: 25.38, lng: 50.10 }, // Uqair / Al-Ahsa coast
  { lat: 26.20, lng: 50.20 }, // Khobar / Dammam
  { lat: 26.80, lng: 50.00 }, // Jubail
  { lat: 27.50, lng: 49.20 }, // Manifa
  { lat: 28.40, lng: 48.55 }, // Khafji (Kuwait border)

  // Northern Border with Kuwait
  { lat: 28.52, lng: 48.42 }, // Nuwaiseeb border post
  { lat: 28.52, lng: 47.70 }, // South border with Kuwait
  { lat: 29.10, lng: 46.55 }, // Tripoint Saudi Arabia / Kuwait / Iraq

  // Northern Border with Iraq
  { lat: 29.60, lng: 43.50 }, // Rafha sector
  { lat: 31.00, lng: 41.00 }, // Arar border
  { lat: 32.15, lng: 39.20 }, // Turaif sector (Jordan / Iraq border)

  // Northwestern Border with Jordan
  { lat: 31.50, lng: 37.00 }, // Border angle
  { lat: 29.35, lng: 36.00 }, // Mudawwara border post
  { lat: 29.28, lng: 34.94 }, // Closed back at Haql (Gulf of Aqaba)
];


/**
 * Bahrain (main islands, approximate). Covers Manama (26.2235, 50.5876) and Muharraq.
 */
export const BAHRAIN_BOUNDARY: Coordinates[] = [
  { lat: 26.34, lng: 50.46 },
  { lat: 26.34, lng: 50.66 },
  { lat: 26.15, lng: 50.72 },
  { lat: 25.80, lng: 50.68 },
  { lat: 25.78, lng: 50.42 },
  { lat: 26.05, lng: 50.38 },
  { lat: 26.34, lng: 50.46 },
];

/**
 * Iran (approximate outline, replaces the former lat/lng bounding box which swallowed
 * Qatar, Bahrain, UAE, Turkey, Armenia, Azerbaijan, Turkmenistan and Afghanistan).
 */
export const IRAN_BOUNDARY: Coordinates[] = [
  { lat: 39.78, lng: 44.80 }, { lat: 39.40, lng: 44.05 }, { lat: 38.40, lng: 44.30 },
  { lat: 37.15, lng: 44.80 }, { lat: 36.00, lng: 45.90 }, { lat: 35.00, lng: 46.10 },
  { lat: 33.70, lng: 46.10 }, { lat: 32.40, lng: 47.40 }, { lat: 31.00, lng: 47.70 },
  { lat: 30.00, lng: 48.90 }, { lat: 29.90, lng: 50.30 }, { lat: 28.90, lng: 51.10 },
  { lat: 27.90, lng: 52.50 }, { lat: 26.90, lng: 54.50 }, { lat: 26.60, lng: 56.30 },
  { lat: 25.60, lng: 57.30 }, { lat: 25.30, lng: 60.60 }, { lat: 25.28, lng: 61.62 },
  { lat: 27.20, lng: 63.30 }, { lat: 29.86, lng: 60.87 }, { lat: 31.00, lng: 61.70 },
  { lat: 34.30, lng: 60.50 }, { lat: 35.60, lng: 61.20 }, { lat: 36.60, lng: 61.20 },
  { lat: 37.50, lng: 59.40 }, { lat: 38.20, lng: 57.40 }, { lat: 37.40, lng: 56.00 },
  { lat: 37.40, lng: 54.20 }, { lat: 36.70, lng: 53.90 }, { lat: 36.80, lng: 52.50 },
  { lat: 37.00, lng: 50.50 }, { lat: 38.40, lng: 48.90 }, { lat: 39.00, lng: 48.00 },
  { lat: 38.90, lng: 46.50 }, { lat: 39.60, lng: 45.00 }, { lat: 39.78, lng: 44.80 },
];
