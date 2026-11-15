/**
 * TURBA Integration & Verification Audit Modal
 * Real-time connection report for Google Maps, NASA, ESA, Copernicus, and Google Earth Engine.
 * Conforms strictly to Section 12 verification reporting rules.
 */

import React from 'react';
import { checkEarthEngineStatus } from '../services/earthEngine';
import { useTranslation } from '../i18n/language';
import { Coordinates } from '../types/farm';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  X,
} from 'lucide-react';

interface SystemStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapsConnected: boolean;
  nasaPowerConnected: boolean;
  nasaSmapConnected: boolean;
  nasaGpmConnected: boolean;
  sentinel2Connected: boolean;
  isGpsAcquired?: boolean;
  isMoroccanBasinActive?: boolean;
  onSelectTestLocation?: (coords: Coordinates, label: string) => void;
}

export const SystemStatusModal: React.FC<SystemStatusModalProps> = ({
  isOpen,
  onClose,
  mapsConnected,
  nasaPowerConnected,
  nasaSmapConnected,
  nasaGpmConnected,
  sentinel2Connected,
  isGpsAcquired = false,
  isMoroccanBasinActive = true,
  onSelectTestLocation,
}) => {
  const { t, language, isRtl } = useTranslation();
  const eeStatus = checkEarthEngineStatus();

  if (!isOpen) return null;

  const isAr = language === 'ar';
  const isEn = language === 'en';

  const verificationItems = [
    {
      feature: 'Google Maps Platform',
      endpointOrDataset: 'Google Maps JS API (@vis.gl/react-google-maps), Hybrid/Satellite & Geometry',
      status: mapsConnected ? 'IMPLEMENTED AND TESTED WITH REAL DATA' : 'NOT CONFIGURED',
      isOk: mapsConnected,
      spatialRes: isAr ? 'أقل من متر (صور الأقمار الصناعية)' : isEn ? 'Sub-meter (Satellite imagery)' : 'Sub-mètre (Imagerie satellite)',
      temporalRes: isAr ? 'تحديث مستمر من جوجل' : isEn ? 'Continuous Google updates' : 'Mise à jour continue Google',
      authStatus: isAr ? 'مفتاح Google Maps Platform نشط' : isEn ? 'Active Google Maps Platform Key' : 'Clé Google Maps Platform active',
      notes: isAr
        ? 'عرض الخرائط الطبوغرافية والفضائية، رسم مضلعات جيوديسية، ومعالم متقدمة.'
        : isEn
        ? 'Display of roadmap and hybrid satellite tiles, geodesic parcel calculation, advanced markers.'
        : 'Affichage des fonds de carte plan et satellite, tracé géodésique des parcelles, repères avancés.',
    },
    {
      feature: isAr ? 'تحديد الموقع GPS' : isEn ? 'GPS Geolocation' : 'Positionnement GPS',
      endpointOrDataset: 'W3C Browser Geolocation API (navigator.geolocation)',
      status: isGpsAcquired
        ? 'IMPLEMENTED AND TESTED WITH REAL DATA'
        : typeof navigator !== 'undefined' && 'geolocation' in navigator
        ? 'READY (STANDBY FOR LOCATION FIX)'
        : 'NOT CONFIGURED',
      isOk: Boolean(isGpsAcquired || (typeof navigator !== 'undefined' && 'geolocation' in navigator)),
      spatialRes: isAr ? 'يحدده جهاز الاستقبال (دائرة الدقة بالأمتار)' : isEn ? 'Device hardware receiver (accuracy radius in meters)' : 'Défini par le récepteur GPS (cercle de précision en mètres)',
      temporalRes: isAr ? 'فوري (توقيت غرينيتش والمغرب)' : isEn ? 'Instantaneous (UTC and Morocco timestamps)' : 'Instantané (horodatage UTC et Maroc)',
      authStatus: isGpsAcquired
        ? (isAr ? 'تم التحقق من موقع الجهاز الفعلي' : isEn ? 'Live Device Coordinates Acquired' : 'Coordonnées réelles acquises')
        : (isAr ? 'إذن المتصفح جاهز في الانتظار' : isEn ? 'Browser Permission Ready' : 'Autorisation navigateur prête'),
      notes: isAr
        ? 'التقاط الإحداثيات الفعلية الخام مع دائرة الدقة وتاريخ الرصد، بدون أي تقريب أو اختلاق.'
        : isEn
        ? 'Capture of raw device coordinates with accuracy circle and timestamp without synthetic rounding.'
        : 'Capture des coordonnées brutes avec rayon de précision et horodatage, sans arrondi artificiel.',
    },
    {
      feature: 'ESA WorldCereal 2021',
      endpointOrDataset: 'ESA/WorldCereal/2021/MODELS/v100 (10m Resolution)',
      status: isMoroccanBasinActive
      ? 'STATIC REFERENCE DATA'
     : 'OUTSIDE MOROCCAN 10M INVENTORY',
     isOk: isMoroccanBasinActive,
      spatialRes: isAr ? '10 أمتار' : isEn ? '10 meters' : '10 mètres',
      temporalRes: isAr ? 'منتج سنوي 2020–2021' : isEn ? 'Annual product 2020–2021' : 'Produit annuel 2020–2021',
      authStatus: isAr ? 'كتالوج عام مفتوح' : isEn ? 'Public Open Catalog' : 'Catalogue public ouvert',
      notes: isAr
        ? 'تغطية الأحواض الزراعية والمروية في المغرب (الغرب، سايس، دكالة، تادلة، سوس، إلخ).'
        : isEn
        ? 'Coverage of Moroccan cereal and irrigated basins (Gharb, Saïss, Doukkala, Tadla, Souss, etc.).'
        : 'Couverture des bassins céréaliers et irrigués du Maroc (Gharb, Saïss, Doukkala, Tadla, Souss, etc.).',
    },
    {
      feature: 'Digital Earth Africa',
      endpointOrDataset: 'DE Africa Cropland Extent 2019 (10m Northern Africa)',
      status: isMoroccanBasinActive
      ? 'STATIC REFERENCE DATA'
      : 'OUTSIDE MOROCCAN 10M INVENTORY',
      isOk: isMoroccanBasinActive,
      spatialRes: isAr ? '10 أمتار' : isEn ? '10 meters' : '10 mètres',
      temporalRes: isAr ? 'مرجع تاريخي 2019' : isEn ? 'Historical 2019 baseline' : 'Référence historique 2019',
      authStatus: isAr ? 'كتالوج عام مفتوح' : isEn ? 'Public Open Catalog' : 'Catalogue public ouvert',
      notes: isAr
        ? 'مطابقة مرجعية لوجود المزروعات مع الحفاظ على تمييزها عن سنة 2026.'
        : isEn
        ? 'Cross-check for historical cropland presence, strictly unconfused with present year.'
        : 'Contrôle croisé de présence de cultures. Non confondu avec un état 2026.',
    },
    {
      feature: 'Google Earth Engine (GEE)',
      endpointOrDataset: 'https://earthengine.googleapis.com/v1alpha/projects/...',
      status: eeStatus.status === 'IMPLEMENTED AND TESTED WITH REAL DATA' ? 'IMPLEMENTED AND TESTED WITH REAL DATA' : 'NOT CONFIGURED',
      isOk: eeStatus.status === 'IMPLEMENTED AND TESTED WITH REAL DATA',
      spatialRes: isAr ? 'متغير حسب المجموعة (10م إلى 250م)' : isEn ? 'Variable by collection (10m to 250m)' : 'Variable selon collection (10m à 250m)',
      temporalRes: isAr ? 'عند الطلب' : isEn ? 'On demand' : 'À la demande',
      authStatus: eeStatus.status === 'IMPLEMENTED AND TESTED WITH REAL DATA'
        ? (isAr ? 'حساب خدمة نشط' : isEn ? 'Active Service Account' : 'Compte de service actif')
        : (isAr ? 'بيانات الاعتماد غير مهيأة' : isEn ? 'GCP Secrets Missing (EE_SERVICE_ACCOUNT)' : 'Secrets GCP manquants (EE_SERVICE_ACCOUNT)'),
      notes: isAr
        ? 'الأنبوب البرمجي جاهز. يُفعل التحليل الراستري الفضائي المباشر عند توفير مفاتيح GCP.'
        : isEn
        ? 'Server pipeline operational. Activates live raster computation once GCP credentials are provided.'
        : 'Pipeline serveur prêt. Active l\'analyse dynamique raster quand les identifiants GCP sont fournis.',
    },
    {
      feature: 'NASA POWER Agroclimatology',
      endpointOrDataset: 'https://power.larc.nasa.gov/api/temporal/daily/point',
      status: nasaPowerConnected ? 'IMPLEMENTED AND TESTED WITH REAL DATA' : 'FAILED',
      isOk: nasaPowerConnected,
      spatialRes: '0.5° x 0.625° (~50 km)',
      temporalRes: isAr ? 'معدل يومي (تأخير رسمي 4 أيام)' : isEn ? 'Daily assimilation (Official 4-day delay)' : 'Moyenne journalière (délai officiel NASA : 4 jours)',
      authStatus: isAr ? 'وصول مفتوح بدون مفتاح (NASA Langley)' : isEn ? 'Open Public Access (NASA Langley Research Center)' : 'Accès public ouvert (NASA Langley Research Center)',
      notes: isAr
        ? 'جلب مباشر لدرجات الحرارة والرطوبة والرياح والإشعاع والأمطار مع الرفض الصارم لأكواد -999.'
        : isEn
        ? 'Live retrieval of T2M, RH2M, WS2M, ALLSKY_SFC_SW_DWN, PRECTOTCORR with strict rejection of -999.'
        : 'Récupération réelle de T2M, RH2M, WS2M, ALLSKY_SFC_SW_DWN, PRECTOTCORR avec rejet des codes -999.',
    },
    {
      feature: 'NASA POWER Soil Wetness (MERRA-2)',
      endpointOrDataset: 'NASA POWER Daily (GWETTOP / GWETROOT)',
      status: nasaSmapConnected ? 'IMPLEMENTED AND TESTED WITH REAL DATA' : 'FAILED',
      isOk: nasaSmapConnected,
      spatialRes: '0.5° x 0.625° (~50 km)',
      temporalRes: isAr ? 'استيعاب سطحي وجذري يومي' : isEn ? 'Daily assimilation (MERRA-2)' : 'Assimilation journalière MERRA-2',
      authStatus: isAr ? 'وصول مفتوح (NASA POWER API)' : isEn ? 'Open Public Access (NASA POWER API)' : 'Accès public ouvert (NASA POWER API)',
      notes: isAr
        ? 'مؤشر بلل التربة السطحي ومنطقة الجذور مستخرج من MERRA-2. الرصد المباشر لمسبار SMAP L3/L4 غير مهيأ لعدم وجود توكن Earthdata.'
        : isEn
        ? 'Surface and root zone soil wetness index from NASA POWER MERRA-2. Direct SMAP L3/L4 radiometer is unconfigured without Earthdata token.'
        : 'Indice wetness de surface et racinaire issu de NASA POWER MERRA-2. L\'observation radiomètre directe SMAP L3/L4 est non configurée sans jeton Earthdata.',
    },
    {
      feature: 'NASA POWER Precipitation (PRECTOTCORR)',
      endpointOrDataset: 'NASA POWER Climatology Baseline & Daily PRECTOTCORR',
      status: nasaGpmConnected ? 'IMPLEMENTED AND TESTED WITH REAL DATA' : 'FAILED',
      isOk: nasaGpmConnected,
      spatialRes: '0.5° x 0.625° (~50 km)',
      temporalRes: isAr ? 'تراكم يومي ومرجع مناخي 30 سنة' : isEn ? 'Daily sum & 30-year climatology baseline' : 'Cumul journalier & Climatologie 30 ans',
      authStatus: isAr ? 'وصول مفتوح (NASA POWER API)' : isEn ? 'Open Public Access (NASA POWER API)' : 'Accès public ouvert (NASA POWER API)',
      notes: isAr
        ? 'هطول مطري مستخرج من نموذج PRECTOTCORR مع مقارنة بالمعدل المناخي الشهري. الرصد المباشر لأسطول GPM IMERG غير مهيأ.'
        : isEn
        ? 'Precipitation extracted from NASA POWER PRECTOTCORR with monthly climatological baseline comparison. Direct GPM IMERG constellation is unconfigured.'
        : 'Précipitations extraites de NASA POWER PRECTOTCORR avec comparaison à la normale trentenaire. La constellation directe GPM IMERG n\'est pas connectée.',
    },
    {
      feature: 'Copernicus Sentinel-2 MSI L2A',
      endpointOrDataset: 'https://catalogue.dataspace.copernicus.eu/odata/v1/Products',
      status: sentinel2Connected ? 'PARTIALLY WORKING' : 'FAILED', // catalogue metadata only: no raster/NDVI processing
      isOk: sentinel2Connected,
      spatialRes: '10 mètres',
      temporalRes: isAr ? 'دورة مرور 5 أيام' : isEn ? '5-day orbit revisit' : 'Cycle de survol 5 jours',
      authStatus: isAr ? 'كتالوج CDSE العام' : isEn ? 'Open CDSE Public Catalog' : 'Accès public catalogue CDSE',
      notes: isAr
        ? 'استرجاع بلاطات الأقمار الصناعية الفعلية ونسبة الغيوم الحقيقية. مؤشر NDVI الطيفي معلن بوضوح كغير مهيأ بدون تنزيل النطاقات.'
        : isEn
        ? 'Identification of real Sentinel-2 granules and actual cloud cover. Direct NDVI is disclosed as NOT CONFIGURED to avoid simulation.'
        : 'Identification des granules réels et couverture nuageuse. Le NDVI direct est marqué NON CONFIGURÉ pour éviter toute simulation.',
    },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-stone-200 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-stone-900">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">{t.systemStatus.modalTitle}</h3>
              <p className="text-xs text-stone-500">{t.systemStatus.modalSubtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t.common.close}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 overflow-y-auto space-y-3">
          {verificationItems.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex flex-col md:flex-row md:items-start justify-between gap-3 shadow-2xs"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-xs text-stone-900">{item.feature}</h4>
                  <span className="text-[10px] text-stone-600 font-mono bg-white px-2 py-0.5 rounded border border-stone-200 truncate max-w-[280px]" dir="ltr">
                    {item.endpointOrDataset}
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 leading-snug">{item.notes}</p>
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-stone-500 font-mono pt-1">
                  <span>{t.systemStatus.colSpatialRes}: {item.spatialRes}</span>
                  <span>•</span>
                  <span>{t.systemStatus.colTemporalRes}: {item.temporalRes}</span>
                  <span>•</span>
                  <span>{t.systemStatus.colAuth}: {item.authStatus}</span>
                </div>
              </div>

              <div className="shrink-0 flex items-center">
                <span
                  className={`flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border ${
                    item.status === 'IMPLEMENTED AND TESTED WITH REAL DATA'
                      ? 'text-emerald-800 bg-emerald-50 border-emerald-300'
                      : item.status === 'STATIC REFERENCE DATA'
                      ? 'text-amber-800 bg-amber-50 border-amber-300'
                      : item.status === 'NOT CONFIGURED'
                      ? 'text-sky-800 bg-sky-50 border-sky-300'
                      : 'text-rose-800 bg-rose-50 border-rose-300'
                  }`}
                  dir="ltr"
                >
                  {item.isOk ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  {item.status}
                </span>
              </div>
            </div>
          ))}

          {/* 6 Mandatory Scientific Verification Locations (Section 9) */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                {t.dashboard.testLocationsTitle}
              </span>
              <span className="text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                Live API Connectivity Tests
              </span>
            </div>
            <p className="text-[11px] text-stone-500">
              {t.dashboard.quickTestNotice}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1 font-mono text-xs">
              {[
                { name: t.dashboard.moroccoTest, lat: 33.8851, lng: -6.8999, country: 'Morocco / Maroc / المغرب' },
                { name: t.dashboard.swedenTest, lat: 65.2722, lng: 21.5030, country: 'Sweden / Suède / السويد' },
                { name: t.dashboard.iranTest, lat: 36.3515, lng: 53.0111, country: 'Iran / إيران' },
                { name: t.dashboard.brazilTest, lat: -11.5270, lng: -53.4859, country: 'Brazil / Brésil / البرازيل' },
                { name: t.dashboard.argentinaTest, lat: -38.8606, lng: -68.0667, country: 'Argentina / Argentine / الأرجنتين' },
                { name: t.dashboard.saudiTest, lat: 24.1302, lng: 47.3117, country: 'Saudi Arabia / Arabie saoudite / السعودية' },
              ].map((loc, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (onSelectTestLocation) {
                      onSelectTestLocation({ lat: loc.lat, lng: loc.lng }, loc.name);
                      onClose();
                    }
                  }}
                  className="p-2.5 rounded-xl bg-white hover:bg-emerald-50/60 border border-stone-200 hover:border-emerald-300 text-start transition-all group flex flex-col justify-between shadow-2xs"
                >
                  <span className="font-bold text-stone-800 group-hover:text-emerald-800 block truncate text-[11px]">
                    {loc.name}
                  </span>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-stone-500 group-hover:text-stone-700" dir="ltr">
                    <span>{loc.lat.toFixed(4)}°, {loc.lng.toFixed(4)}°</span>
                    <span className="text-emerald-700 font-bold">Inspect →</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Earth Engine Configuration guide if needed */}
          {eeStatus.status === 'NOT CONFIGURED' && (
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-amber-900 font-bold">
                <Cpu className="w-4 h-4 text-amber-600" />
                <span>
                  {isAr
                    ? 'تهيئة خادم Google Earth Engine (اختياري للمعالجة المباشرة)'
                    : isEn
                    ? 'Google Earth Engine Configuration (Optional Live Raster Processing)'
                    : 'Configuration Google Earth Engine (Traitement Raster en Ligne)'}
                </span>
              </div>
              <p className="text-stone-700 leading-relaxed text-[11px]">
                {isAr
                  ? 'الأنبوب البرمجي لـ GEE جاهز ومبني. لتفعيل الحسابات الراسترية المباشرة في السحابة بدلاً من الكتالوج المتجهي 10م المدمج، يمكنك إضافة أسرار GCP التالية:'
                  : isEn
                  ? 'The GEE backend integration pipeline is ready. To enable live cloud raster calculations instead of the built-in 10m vector catalog, provide the following GCP secrets:'
                  : 'Le pipeline d\'intégration GEE est codé et opérationnel. Pour activer le calcul dynamique en nuage sur les collections WorldCereal au lieu du catalogue vectoriel 10m embarqué, déclarez les variables suivantes :'}
              </p>
              <ul className="list-disc list-inside text-[11px] text-stone-600 space-y-0.5 font-mono" dir="ltr">
                {eeStatus.missingItems.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
          <span className="text-[11px] text-stone-500">
            {isAr
              ? 'متوافق مع ميثاق المصداقية العلمية لمنصة تُربة (بدون أي محاكاة أو أرقام وهمية).'
              : isEn
              ? 'Conforms to TURBA scientific integrity standards (No simulated or fabricated data).'
              : 'Conforme à la charte d\'intégrité scientifique TURBA (Pas de valeurs simulées ni fictives).'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
          >
            {t.systemStatus.closeAudit}
          </button>
        </div>
      </div>
    </div>
  );
};
