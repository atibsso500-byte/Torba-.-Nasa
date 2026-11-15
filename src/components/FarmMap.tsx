/// <reference types="google.maps" />
/**
 * TURBA Agricultural Map of Morocco
 * Powered by Google Maps Platform JavaScript API (@vis.gl/react-google-maps)
 * Displays real agricultural datasets (ESA WorldCereal 2021 & Digital Earth Africa 2019),
 * supports satellite mode, polygon drawing, high-accuracy GPS location with accuracy radius,
 * and farm parcel inspection with strict data integrity.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  APIProvider,
  Map as GoogleMapComponent,
  AdvancedMarker,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  Coordinates,
  MoroccanAgriculturalZone,
  AgriculturalClassification,
  FarmRecord,
  GpsLocationRecord,
} from '../types/farm';
import {
  MOROCCAN_AGRICULTURAL_ZONES,
  MOROCCO_DEFAULT_CENTER,
  getZoneDisplayName,
  getCropLabel,
} from '../data/morocco';
import { useTranslation } from '../i18n/language';
import {
  calculateGeodesicAreaM2,
  convertM2ToHectares,
  classifyAgriculturalCoordinate,
  calculateCentroid,
  validatePolygon,
  formatCoordinates,
} from '../utils/geo';
import {
  MapPin,
  Layers,
  Crosshair,
  Pencil,
  RotateCcw,
  Check,
  Eye,
  Compass,
  AlertTriangle,
  Radio,
  Clock,
  AlertCircle,
  X,
} from 'lucide-react';

interface AgriculturalMapProps {
  apiKey: string;
  activeFarm: FarmRecord | null;
  savedFarms: FarmRecord[];
  onSelectCoordinate: (coords: Coordinates, classification?: AgriculturalClassification) => void;
  onSelectFarm?: (farm: FarmRecord) => void;
  onOpenSaveModal: (polygon: Coordinates[], areaHa: number, areaM2: number, coords: Coordinates) => void;
  onGpsAcquired?: (gpsRecord: GpsLocationRecord) => void;
  resetDrawingTrigger?: number;
  dismissOverlaysTrigger?: number;
}

// Inner controller component to manage Google Maps instances, polygon overlays, circles, and drawing events
const MapOverlayController: React.FC<{
  activeFarm: FarmRecord | null;
  savedFarms: FarmRecord[];
  isDrawingMode: boolean;
  drawingPoints: Coordinates[];
  onMapClick: (coords: Coordinates) => void;
  onSelectFarm?: (farm: FarmRecord) => void;
  showWorldCerealLayer: boolean;
  showDeAfricaLayer: boolean;
  selectedZoneId: string | null;
  onSelectZone: (zone: MoroccanAgriculturalZone) => void;
  currentGpsCoord: Coordinates | null;
  gpsAccuracyMeters: number | null;
}> = ({
  activeFarm,
  savedFarms,
  isDrawingMode,
  drawingPoints,
  onMapClick,
  onSelectFarm,
  showWorldCerealLayer,
  showDeAfricaLayer,
  selectedZoneId,
  onSelectZone,
  currentGpsCoord,
  gpsAccuracyMeters,
}) => {
  const map = useMap();
  const zonePolygonsRef = useRef<google.maps.Polygon[]>([]);
  const farmPolygonsRef = useRef<google.maps.Polygon[]>([]);
  const drawingPolygonRef = useRef<google.maps.Polygon | null>(null);
  const gpsAccuracyCircleRef = useRef<google.maps.Circle | null>(null);

  // Clear existing rendered overlays
  const clearOverlays = useCallback(() => {
    zonePolygonsRef.current.forEach((p) => p.setMap(null));
    zonePolygonsRef.current = [];
    farmPolygonsRef.current.forEach((p) => p.setMap(null));
    farmPolygonsRef.current = [];
    if (drawingPolygonRef.current) {
      drawingPolygonRef.current.setMap(null);
      drawingPolygonRef.current = null;
    }
    if (gpsAccuracyCircleRef.current) {
      gpsAccuracyCircleRef.current.setMap(null);
      gpsAccuracyCircleRef.current = null;
    }
  }, []);

  // Handle map click events
  useEffect(() => {
    if (!map) return;

    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const coords: Coordinates = {
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
        };
        onMapClick(coords);
      }
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, onMapClick]);

  // Render GPS Accuracy Circle
  useEffect(() => {
    if (!map) return;

    if (gpsAccuracyCircleRef.current) {
      gpsAccuracyCircleRef.current.setMap(null);
      gpsAccuracyCircleRef.current = null;
    }

    if (currentGpsCoord && typeof gpsAccuracyMeters === 'number' && gpsAccuracyMeters > 0) {
      gpsAccuracyCircleRef.current = new google.maps.Circle({
        strokeColor: '#38bdf8',
        strokeOpacity: 0.8,
        strokeWeight: 1.5,
        fillColor: '#38bdf8',
        fillOpacity: 0.15,
        map: map,
        center: currentGpsCoord,
        radius: gpsAccuracyMeters,
        zIndex: 5,
      });
    }

    return () => {
      if (gpsAccuracyCircleRef.current) {
        gpsAccuracyCircleRef.current.setMap(null);
        gpsAccuracyCircleRef.current = null;
      }
    };
  }, [map, currentGpsCoord, gpsAccuracyMeters]);

  // Render ESA WorldCereal & Digital Earth Africa agricultural zones
  useEffect(() => {
    if (!map) return;

    zonePolygonsRef.current.forEach((p) => p.setMap(null));
    zonePolygonsRef.current = [];

    if (!showWorldCerealLayer) return;

    MOROCCAN_AGRICULTURAL_ZONES.forEach((zone) => {
      const isSelected = selectedZoneId === zone.id;
      let fillColor = '#10b981'; // temporary crops emerald
      let strokeColor = '#059669';

      if (zone.classification.cropType === 'cereals_winter') {
        fillColor = '#f59e0b'; // amber gold
        strokeColor = '#d97706';
      } else if (zone.classification.cropType === 'irrigation_active') {
        fillColor = '#06b6d4'; // cyan
        strokeColor = '#0891b2';
      } else if (zone.classification.cropType === 'cropland_general') {
        fillColor = '#84cc16'; // lime
        strokeColor = '#65a30d';
      }

      if (isSelected) {
        fillColor = '#3b82f6';
        strokeColor = '#1d4ed8';
      }

      const poly = new google.maps.Polygon({
        paths: zone.polygon,
        strokeColor: strokeColor,
        strokeOpacity: isSelected ? 0.95 : 0.75,
        strokeWeight: isSelected ? 3 : 1.5,
        fillColor: fillColor,
        fillOpacity: isSelected ? 0.45 : 0.22,
        map: map,
        clickable: true,
        zIndex: isSelected ? 10 : 2,
      });

      poly.addListener('click', (e: google.maps.MapMouseEvent) => {
        onSelectZone(zone);
        if (e.latLng) {
          onMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        }
      });

      zonePolygonsRef.current.push(poly);
    });

    return () => {
      zonePolygonsRef.current.forEach((p) => p.setMap(null));
      zonePolygonsRef.current = [];
    };
  }, [map, showWorldCerealLayer, selectedZoneId, onSelectZone, onMapClick]);

  // Render Saved Farms polygons
  useEffect(() => {
    if (!map) return;

    farmPolygonsRef.current.forEach((p) => p.setMap(null));
    farmPolygonsRef.current = [];

    savedFarms.forEach((farm) => {
      if (!farm.polygon || farm.polygon.length < 3) return;
      const isActive = activeFarm?.id === farm.id;

      const poly = new google.maps.Polygon({
        paths: farm.polygon,
        strokeColor: isActive ? '#ec4899' : '#14b8a6',
        strokeOpacity: 0.95,
        strokeWeight: isActive ? 3 : 2,
        fillColor: isActive ? '#ec4899' : '#14b8a6',
        fillOpacity: isActive ? 0.4 : 0.2,
        map: map,
        zIndex: isActive ? 20 : 15,
      });

      poly.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (isDrawingMode) {
          if (e.latLng) {
            onMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
          }
        } else if (onSelectFarm) {
          onSelectFarm(farm);
        } else {
          onMapClick(farm.centroid);
        }
      });

      farmPolygonsRef.current.push(poly);
    });

    return () => {
      farmPolygonsRef.current.forEach((p) => p.setMap(null));
      farmPolygonsRef.current = [];
    };
  }, [map, savedFarms, activeFarm, isDrawingMode, onMapClick, onSelectFarm]);

  // Render In-Progress Polygon Drawing
  useEffect(() => {
    if (!map) return;

    if (drawingPolygonRef.current) {
      drawingPolygonRef.current.setMap(null);
      drawingPolygonRef.current = null;
    }

    if (isDrawingMode && drawingPoints.length >= 2) {
      drawingPolygonRef.current = new google.maps.Polygon({
        paths: drawingPoints,
        strokeColor: '#f43f5e',
        strokeOpacity: 0.9,
        strokeWeight: 2,
        strokePosition: google.maps.StrokePosition.CENTER,
        fillColor: '#f43f5e',
        fillOpacity: 0.25,
        map: map,
        zIndex: 50,
      });
    }

    return () => {
      if (drawingPolygonRef.current) {
        drawingPolygonRef.current.setMap(null);
        drawingPolygonRef.current = null;
      }
    };
  }, [map, isDrawingMode, drawingPoints]);

  // Pan to active farm when selected
  useEffect(() => {
    if (!map || !activeFarm) return;
    map.panTo(activeFarm.centroid);
    const currentZoom = map.getZoom();
    if (typeof currentZoom === 'number' && currentZoom < 11) {
      map.setZoom(12);
    }
  }, [map, activeFarm]);

  useEffect(() => {
    return () => {
      clearOverlays();
    };
  }, [clearOverlays]);

  return null;
};

export const AgriculturalMap: React.FC<AgriculturalMapProps> = ({
  apiKey,
  activeFarm,
  savedFarms,
  onSelectCoordinate,
  onSelectFarm,
  onOpenSaveModal,
  onGpsAcquired,
  resetDrawingTrigger,
  dismissOverlaysTrigger,
}) => {
  const { t, language, isRtl } = useTranslation();
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('hybrid');
  const [showWorldCereal, setShowWorldCereal] = useState(true);
  const [showDeAfrica, setShowDeAfrica] = useState(false);
  const [selectedZone, setSelectedZone] = useState<MoroccanAgriculturalZone | null>(null);

  // Drawing state
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Coordinates[]>([]);
  const [drawingError, setDrawingError] = useState<string | null>(null);

  // GPS state
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [currentGpsCoord, setCurrentGpsCoord] = useState<Coordinates | null>(null);
  const [gpsAccuracyMeters, setGpsAccuracyMeters] = useState<number | null>(null);
  const [gpsTimestamp, setGpsTimestamp] = useState<string | null>(null);

  // Map center & inspected position
  const [inspectedCoord, setInspectedCoord] = useState<Coordinates | null>(
    activeFarm ? activeFarm.centroid : MOROCCO_DEFAULT_CENTER
  );
  const [inspectedClassification, setInspectedClassification] = useState<AgriculturalClassification | null>(
    activeFarm ? activeFarm.classification : null
  );

  // Sync inspected map marker and bottom info badge when activeFarm changes (unless in drawing mode)
  useEffect(() => {
    if (activeFarm && !isDrawingMode) {
      setInspectedCoord(activeFarm.centroid);
      setInspectedClassification(activeFarm.classification);
      const res = classifyAgriculturalCoordinate(activeFarm.centroid);
      setSelectedZone(res.zone);
    }
  }, [activeFarm, isDrawingMode]);

  // Reset drawing mode and points after farm is successfully saved
  useEffect(() => {
    if (resetDrawingTrigger && resetDrawingTrigger > 0) {
      setIsDrawingMode(false);
      setDrawingPoints([]);
      setDrawingError(null);
    }
  }, [resetDrawingTrigger]);

  // Auto-hide floating GPS status card and map popups when modals, drawers, language dropdown, or dashboard tabs change
  useEffect(() => {
    if (dismissOverlaysTrigger && dismissOverlaysTrigger > 0) {
      setCurrentGpsCoord(null);
      setGpsError(null);
      setDrawingError(null);
    }
  }, [dismissOverlaysTrigger]);

  // Calculate drawing area dynamically
  const drawingAreaM2 = useMemo(() => {
    if (drawingPoints.length < 3) return 0;
    return calculateGeodesicAreaM2(drawingPoints);
  }, [drawingPoints]);

  const drawingAreaHa = useMemo(() => {
    return convertM2ToHectares(drawingAreaM2);
  }, [drawingAreaM2]);

  // Handle map click
  const handleMapClick = useCallback(
    (coords: Coordinates) => {
      if (isDrawingMode) {
        setDrawingPoints((prev) => [...prev, coords]);
        setDrawingError(null);
        return;
      }

      setInspectedCoord(coords);
      const res = classifyAgriculturalCoordinate(coords);
      setSelectedZone(res.zone);
      setInspectedClassification(res.classification);
      onSelectCoordinate(coords, res.classification);
    },
    [isDrawingMode, onSelectCoordinate]
  );

  // Locate User via Geolocation API
  const handleFindGpsLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError(t.map.gpsErrorUnsupported);
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const rawCoords: Coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const accuracy = typeof position.coords.accuracy === 'number' ? Math.round(position.coords.accuracy) : null;
        const nowIso = new Date().toISOString();
        const localeCode = language === 'ar' ? 'ar-MA' : language === 'fr' ? 'fr-FR' : 'en-US';
        const moroccoTime = new Intl.DateTimeFormat(localeCode, {
          timeZone: 'Africa/Casablanca',
          dateStyle: 'short',
          timeStyle: 'medium',
        }).format(new Date(position.timestamp || Date.now()));

        setCurrentGpsCoord(rawCoords);
        setGpsAccuracyMeters(accuracy);
        setGpsTimestamp(moroccoTime);
        setInspectedCoord(rawCoords);

        const res = classifyAgriculturalCoordinate(rawCoords);
        setSelectedZone(res.zone);
        setInspectedClassification(res.classification);
        onSelectCoordinate(rawCoords, res.classification);

        if (onGpsAcquired) {
          onGpsAcquired({
            coordinates: rawCoords,
            accuracyMeters: accuracy,
            timestamp: nowIso,
            displayTimeMorocco: moroccoTime,
          });
        }
      },
      (err) => {
        setIsLocating(false);
        let msg = t.map.gpsErrorGeneric;
        if (err.code === err.PERMISSION_DENIED) {
          msg = t.map.gpsErrorDenied;
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = t.map.gpsErrorUnavailable;
        } else if (err.code === err.TIMEOUT) {
          msg = t.map.gpsErrorTimeout;
        }
        setGpsError(msg);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, [language, onSelectCoordinate, onGpsAcquired, t.map]);

  // Basin quick jump
  const handleJumpToBasin = (zone: MoroccanAgriculturalZone) => {
    setSelectedZone(zone);
    setInspectedCoord(zone.centroid);
    setInspectedClassification(zone.classification);
    onSelectCoordinate(zone.centroid, zone.classification);
  };

  // Complete drawing, validate thoroughly, calculate true centroid, and open save modal
  // Note: Drawing mode and drawn polygon are preserved while modal is open, and only reset after user saves or cancels
  const handleFinishDrawing = () => {
    const validation = validatePolygon(drawingPoints);
    if (!validation.isValid) {
      setDrawingError(validation.error || 'Invalid parcel geometry');
      return;
    }

    const trueCentroid = calculateCentroid(drawingPoints);
    const finalAreaM2 = validation.areaM2 || drawingAreaM2;
    const finalAreaHa = validation.areaHa || drawingAreaHa;

    setDrawingError(null);
    onOpenSaveModal(drawingPoints, finalAreaHa, finalAreaM2, trueCentroid);
  };

  return (
    <div className="relative w-full h-full min-h-[520px] bg-stone-900 overflow-hidden flex flex-col">
      {/* Top Map Control Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Layer & Map Type Controls */}
        <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-stone-200/90 shadow-md pointer-events-auto">
          <div className="flex rounded-lg bg-stone-100 p-0.5 border border-stone-200 text-xs font-medium">
            <button
              onClick={() => setMapType('hybrid')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                mapType === 'hybrid'
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {t.map.satellite}
            </button>
            <button
              onClick={() => setMapType('roadmap')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                mapType === 'roadmap'
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {t.map.roadmap}
            </button>
          </div>

          <div className="h-4 w-[1px] bg-stone-200 mx-1" />

          {/* Toggle ESA WorldCereal */}
          <button
            onClick={() => setShowWorldCereal((v) => !v)}
            title={t.map.worldCerealTooltip}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              showWorldCereal
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold shadow-xs'
                : 'bg-stone-50 border-stone-200 text-stone-600 hover:text-stone-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.map.worldCerealLayer}</span>
          </button>

          {/* Toggle DE Africa */}
          <button
            onClick={() => setShowDeAfrica((v) => !v)}
            title={t.map.deAfricaTooltip}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              showDeAfrica
                ? 'bg-sky-50 border-sky-300 text-sky-800 font-semibold shadow-xs'
                : 'bg-stone-50 border-stone-200 text-stone-600 hover:text-stone-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-sky-600" />
            <span>{t.map.deAfricaLayer}</span>
          </button>
        </div>

        {/* Moroccan Agricultural Basins Selector */}
        <div className="hidden md:flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-stone-200/90 shadow-md pointer-events-auto">
          <Compass className="w-3.5 h-3.5 text-emerald-700 mx-0.5" />
          <span className="text-xs text-stone-600 font-medium">{t.map.basinsLabel}</span>
          <select
            value={selectedZone?.id || ''}
            onChange={(e) => {
              const z = MOROCCAN_AGRICULTURAL_ZONES.find((item) => item.id === e.target.value);
              if (z) handleJumpToBasin(z);
            }}
            className="bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 px-2.5 py-1 outline-none focus:border-emerald-600 cursor-pointer max-w-[220px] truncate font-medium"
          >
            <option value="">{t.map.selectBasinPlaceholder}</option>
            {MOROCCAN_AGRICULTURAL_ZONES.map((z) => (
              <option key={z.id} value={z.id}>
                {getZoneDisplayName(z, language).split('–')[0]?.trim()} ({z.region})
              </option>
            ))}
          </select>
        </div>

        {/* GPS Button */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={handleFindGpsLocation}
            disabled={isLocating}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md border backdrop-blur-md transition-all ${
              isLocating
                ? 'bg-amber-600 text-white animate-pulse border-amber-500'
                : 'bg-white/95 hover:bg-stone-50 border-stone-200 text-stone-800 hover:border-emerald-600 hover:text-emerald-900'
            }`}
          >
            <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : 'text-emerald-700'}`} />
            <span>{isLocating ? t.map.locatingGps : t.map.myGpsPosition}</span>
          </button>
        </div>
      </div>

      {/* GPS Status Card (Preserves coordinates, accuracy in meters, and timestamp) */}
      {currentGpsCoord && (
        <div className={`absolute top-16 ${isRtl ? 'right-3' : 'left-3'} z-10 bg-white/95 border border-sky-300 text-stone-800 p-3 rounded-xl text-xs shadow-xl backdrop-blur-md flex flex-col gap-1 pointer-events-auto max-w-xs`}>
          <div className="flex items-center justify-between border-b border-stone-100 pb-1">
            <span className="font-bold text-sky-800 flex items-center gap-1.5 text-[11px]">
              <Radio className="w-3.5 h-3.5 animate-pulse text-sky-600" />
              {t.map.gpsAcquiredReal}
            </span>
            <button
              onClick={() => setCurrentGpsCoord(null)}
              aria-label={t.common.close}
              className="text-stone-400 hover:text-stone-800 p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="font-mono text-[11px] text-stone-900 font-semibold" dir="ltr">
            {formatCoordinates(currentGpsCoord, 6)}
          </div>
          <div className="flex items-center justify-between text-[10px] text-stone-500">
            <span>{t.map.gpsAccuracy} {gpsAccuracyMeters ? `±${gpsAccuracyMeters} m` : t.map.gpsStandardAccuracy}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-stone-400" />
              {gpsTimestamp || t.common.syncTime}
            </span>
          </div>
          <p className="text-[9px] text-stone-500 italic mt-0.5">
            {t.map.gpsDeviceNote}
          </p>
        </div>
      )}

      {/* GPS Error notice */}
      {gpsError && (
        <div className="absolute top-16 left-3 right-3 z-10 max-w-md mx-auto bg-rose-50 border border-rose-300 text-rose-900 p-2.5 rounded-xl text-xs flex items-center justify-between shadow-xl backdrop-blur-md pointer-events-auto">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{gpsError}</span>
          </div>
          <button
            onClick={() => setGpsError(null)}
            aria-label={t.common.close}
            className="text-rose-600 hover:text-rose-900 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Drawing Toolbar Overlay */}
      <div className={`absolute bottom-5 ${isRtl ? 'right-3' : 'left-3'} z-10 pointer-events-auto`}>
        <div className="bg-white/95 backdrop-blur-md p-2 rounded-2xl border border-stone-200/90 shadow-xl flex flex-col gap-2">
          {!isDrawingMode ? (
            <button
              onClick={() => {
                setIsDrawingMode(true);
                setDrawingPoints([]);
                setDrawingError(null);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{t.map.drawParcel}</span>
            </button>
          ) : (
            <div className="flex flex-col gap-2 min-w-[250px] p-1">
              <div className="flex items-center justify-between border-b border-stone-100 pb-1.5">
                <span className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  {t.map.drawingActive}
                </span>
                <span className="text-[11px] text-stone-500 font-mono">
                  {drawingPoints.length} {t.map.verticesCount}
                </span>
              </div>

              {/* Drawing validation error */}
              {drawingError && (
                <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-tight">{drawingError}</span>
                </div>
              )}

              {drawingPoints.length >= 3 && (
                <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                  <span className="text-emerald-900 font-medium">{t.map.geodesicArea}</span>
                  <span className="font-mono font-bold text-emerald-800" dir="ltr">
                    {drawingAreaHa} {t.common.hectares} ({drawingAreaM2.toLocaleString()} {t.common.sqMeters})
                  </span>
                </div>
              )}

              <p className="text-[11px] text-stone-500 leading-tight">
                {drawingPoints.length < 3
                  ? t.map.drawingHintStart
                  : t.map.drawingHintClose}
              </p>

              <div className="flex items-center gap-1.5 mt-1">
                <button
                  onClick={() => {
                    setDrawingPoints((p) => p.slice(0, -1));
                    setDrawingError(null);
                  }}
                  disabled={drawingPoints.length === 0}
                  className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 disabled:opacity-40 text-xs flex items-center gap-1"
                  title={t.map.undoLastPoint}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    setIsDrawingMode(false);
                    setDrawingPoints([]);
                    setDrawingError(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 text-xs font-medium"
                >
                  {t.common.cancel}
                </button>

                <button
                  onClick={handleFinishDrawing}
                  disabled={drawingPoints.length < 3}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-40 shadow-sm transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{t.common.save} ({drawingAreaHa} {t.common.hectares})</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Coordinates & Status Info Badge */}
      <div className={`absolute bottom-5 ${isRtl ? 'left-3' : 'right-3'} z-10 pointer-events-auto`}>
        <div className="bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-stone-200/90 shadow-md flex items-center gap-3 text-xs text-stone-800">
          <div className="flex items-center gap-1.5 font-mono text-stone-800 font-semibold" dir="ltr">
            <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>
              {inspectedCoord ? formatCoordinates(inspectedCoord, 5) : t.map.moroccoOverview}
            </span>
          </div>

          <div className="h-3.5 w-[1px] bg-stone-200" />

          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                inspectedClassification?.status === 'confirmed_agricultural'
                  ? 'bg-emerald-500'
                  : 'bg-stone-400'
              }`}
            />
            <span className="text-[11px] text-stone-700 font-medium">
              {inspectedClassification
                ? getCropLabel(inspectedClassification, language)
                : t.map.agriculturalPerimeter}
            </span>
          </div>
        </div>
      </div>

      {/* Main Google Maps Render Container */}
      <div className="w-full flex-1 relative">
        <APIProvider
          key={`gmap-provider-${language}`}
          apiKey={apiKey}
          language={language}
          region="MA"
        >
          <GoogleMapComponent
            mapId="DEMO_MAP_ID"
            defaultCenter={MOROCCO_DEFAULT_CENTER}
            defaultZoom={7}
            mapTypeId={mapType}
            gestureHandling="greedy"
            disableDefaultUI={false}
            style={{ width: '100%', height: '100%' }}
          >
            <MapOverlayController
              activeFarm={activeFarm}
              savedFarms={savedFarms}
              isDrawingMode={isDrawingMode}
              drawingPoints={drawingPoints}
              onMapClick={handleMapClick}
              onSelectFarm={onSelectFarm}
              showWorldCerealLayer={showWorldCereal}
              showDeAfricaLayer={showDeAfrica}
              selectedZoneId={selectedZone?.id || null}
              onSelectZone={setSelectedZone}
              currentGpsCoord={currentGpsCoord}
              gpsAccuracyMeters={gpsAccuracyMeters}
            />

            {/* Marker on Inspected Coordinate */}
            {inspectedCoord && (
              <AdvancedMarker position={inspectedCoord} title={t.map.pointMarkerTitle}>
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-8 h-8 rounded-full bg-emerald-500/20 animate-radar" />
                  <div className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-stone-900" />
                  </div>
                </div>
              </AdvancedMarker>
            )}

            {/* GPS Marker */}
            {currentGpsCoord && (
              <AdvancedMarker position={currentGpsCoord} title={t.map.gpsMarkerTitle}>
                <div className="w-6 h-6 rounded-full bg-sky-500/30 border-2 border-sky-400 flex items-center justify-center shadow-lg">
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                </div>
              </AdvancedMarker>
            )}

            {/* Markers for Drawing Vertices */}
            {isDrawingMode &&
              drawingPoints.map((pt, idx) => (
                <AdvancedMarker key={`draw-pt-${idx}`} position={pt}>
                  <div className="w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white shadow-md flex items-center justify-center text-[8px] font-bold text-white">
                    {idx + 1}
                  </div>
                </AdvancedMarker>
              ))}
          </GoogleMapComponent>
        </APIProvider>
      </div>
    </div>
  );
};

