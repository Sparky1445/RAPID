import React, { useEffect, useState } from 'react';
// Aliased: the component is called Map, which would shadow the global Map
// constructor used by the marker caches below.
import { APIProvider, Map as GoogleMap, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { useShallow } from 'zustand/react/shallow';
import useRapidStore from '../../store/rapidStore';
import { Polyline, Circle, Polygon, MapCamera } from './gmapPrimitives';
import { policeStationMarker, rapidBaseMarker, incidentMarker, droneMarker, FLYING_STATUSES } from '../shared/utils';

const FALLBACK_CENTER = { lat: 15.3995, lng: 73.8800 };
const FALLBACK_ZOOM = 11;

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
// Advanced markers and cloud styling both need a Map ID. It is not a secret
// and may be committed; the API key must not be.
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

const ACCENT = '#1E3A8A';
const WARNING = '#A15C00';
const URGENT = '#B5461A';
const CRITICAL = '#A3211D';

const HOLDING_STATUSES = ['On Scene', 'AI Monitoring', 'Hovering', 'Orbiting', 'Following Target', 'Awaiting Controller'];

// No theme toggle ships in this pass, but the token system underneath
// already supports one, so the map follows the data-theme attribute on
// <html> whenever one is added.
function useIsDarkTheme() {
  const [isDark, setIsDark] = useState(
    typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark'
  );
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.getAttribute('data-theme') === 'dark');
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

// Shown when VITE_GOOGLE_MAPS_API_KEY is absent. A dispatcher still needs to
// know where every unit is, so this lists the same data the map would plot
// rather than leaving an empty panel.
function MapUnavailable({ drones, incidents, bases }) {
  const sections = [
    ['Incidents', incidents.map(i => [i.title, i.severity, i.latitude, i.longitude])],
    ['Drones', drones.map(d => [d.call_sign, d.status, d.latitude, d.longitude])],
    ['Bases', bases.map(b => [b.name, '', b.latitude, b.longitude])],
  ];
  return (
    <div className="h-full w-full overflow-auto bg-page p-4">
      <p className="text-xs text-status-warning font-semibold mb-1">Map unavailable</p>
      <p className="text-[11px] text-muted mb-4 max-w-prose">
        No Google Maps key is configured, so positions are listed instead of plotted.
        Set VITE_GOOGLE_MAPS_API_KEY in client/.env to restore the map.
      </p>
      {sections.map(([label, rows]) => (
        <div key={label} className="mb-5">
          <h3 className="text-[10px] uppercase tracking-wider text-muted mb-1.5">{label}</h3>
          {rows.length === 0 ? (
            <p className="text-[11px] text-muted">None</p>
          ) : (
            <ul className="space-y-0.5">
              {rows.map(([name, state, lat, lng], i) => (
                <li key={`${label}-${i}`} className="font-mono text-[11px] text-text flex gap-3">
                  <span className="min-w-[9rem] truncate">{name}</span>
                  <span className="min-w-[7rem] text-muted truncate">{state}</span>
                  <span className="tabular-nums">{Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

export default function RapidMap() {
  const droneHistory = useRapidStore(s => s.droneHistory);
  const selectedDroneId = useRapidStore(s => s.selectedDroneId);
  const showPoliceStations = useRapidStore(s => s.showPoliceStations);
  const showNoFlyZones = useRapidStore(s => s.showNoFlyZones);
  const showCoverageRadius = useRapidStore(s => s.showCoverageRadius);
  const setShowPoliceStations = useRapidStore(s => s.setShowPoliceStations);
  const setShowNoFlyZones = useRapidStore(s => s.setShowNoFlyZones);
  const setShowCoverageRadius = useRapidStore(s => s.setShowCoverageRadius);
  const selectDrone = useRapidStore(s => s.selectDrone);

  const activeState = useRapidStore(s => s.activeState);
  const bases = useRapidStore(useShallow(s => s.getVisibleBases()));
  const drones = useRapidStore(useShallow(s => s.getVisibleDrones()));
  const incidents = useRapidStore(useShallow(s => s.getVisibleIncidents()));
  const mapConfig = useRapidStore(s => s.getActiveMapConfig());

  const [info, setInfo] = useState(null);
  const isDark = useIsDarkTheme();

  const mapCenter = mapConfig
    ? { lat: mapConfig.mapCenter.latitude, lng: mapConfig.mapCenter.longitude }
    : FALLBACK_CENTER;
  const mapZoom = mapConfig ? mapConfig.mapZoom : FALLBACK_ZOOM;
  const policeStations = mapConfig ? mapConfig.policeStations : [];
  const noFlyZones = mapConfig ? mapConfig.noFlyZones : [];

  const activeIncidents = incidents.filter(i => ['reported', 'dispatched', 'active', 'resolved'].includes(i.status));

  return (
    <section className="order-1 lg:order-none lg:col-span-6 relative lg:border-r border-border flex flex-col min-h-[420px] lg:min-h-0 z-10">
      {API_KEY && (
        <div className="absolute top-4 right-4 z-20 bg-surface border border-border p-2 rounded-xl text-[11px] font-mono text-muted select-none max-w-[180px]">
          <span className="text-[10px] text-muted font-bold uppercase block tracking-wider mb-1 px-1">Show on map</span>
          {[
            [showPoliceStations, setShowPoliceStations, 'Police stations'],
            [showNoFlyZones, setShowNoFlyZones, 'No-fly zones'],
            [showCoverageRadius, setShowCoverageRadius, 'Drone bases']
          ].map(([val, setter, label]) => (
            // The label is the target, so it carries the 44px, not the box.
            <label
              key={label}
              className="flex items-center gap-2 min-h-[44px] px-1 cursor-pointer hover:text-text rounded-lg focus-within:outline focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-accent"
            >
              <input
                type="checkbox"
                checked={val}
                onChange={e => setter(e.target.checked)}
                className="h-4 w-4 flex-shrink-0 accent-[var(--color-accent)]"
              />
              {label}
            </label>
          ))}
        </div>
      )}

      <div className="flex-1 w-full h-full relative z-10">
        {!API_KEY ? (
          <MapUnavailable drones={drones} incidents={activeIncidents} bases={bases} />
        ) : (
          <APIProvider apiKey={API_KEY}>
            <GoogleMap
              mapId={MAP_ID}
              defaultCenter={mapCenter}
              defaultZoom={mapZoom}
              colorScheme={isDark ? 'DARK' : 'LIGHT'}
              disableDefaultUI
              zoomControl
              gestureHandling="greedy"
              style={{ height: '100%', width: '100%' }}
            >
              <MapCamera center={mapCenter} zoom={mapZoom} key={activeState} />

              {showPoliceStations && policeStations.map((ps, i) => (
                <AdvancedMarker
                  key={`ps-${i}`}
                  position={{ lat: ps.latitude, lng: ps.longitude }}
                  onClick={() => setInfo({
                    position: { lat: ps.latitude, lng: ps.longitude },
                    body: <p className="text-xs font-mono font-bold">{ps.name}</p>
                  })}
                >
                  {policeStationMarker}
                </AdvancedMarker>
              ))}

              {bases.map((b) => (
                <React.Fragment key={`base-${b.id}`}>
                  <AdvancedMarker
                    position={{ lat: b.latitude, lng: b.longitude }}
                    onClick={() => setInfo({
                      position: { lat: b.latitude, lng: b.longitude },
                      body: (
                        <div className="text-xs font-mono font-semibold">
                          <p className="font-extrabold">{b.name}</p>
                          <p>Drones Docked: {drones.filter(d => d.base_id === b.id && d.status === 'Standby').length}</p>
                        </div>
                      )
                    })}
                  >
                    {rapidBaseMarker}
                  </AdvancedMarker>
                  {showCoverageRadius && (
                    <Circle center={{ lat: b.latitude, lng: b.longitude }} radius={b.coverage_radius_m} strokeColor={ACCENT} strokeWeight={1} fillOpacity={0.03} dashed />
                  )}
                </React.Fragment>
              ))}

              {showNoFlyZones && noFlyZones.map((nfz, i) => {
                // Colour by restriction level: absolute reads as more urgent
                // than an advisory patrol zone. The level is also spelled out
                // in the info window, never conveyed by colour alone.
                const zoneColor = nfz.restrictionLevel === 'advisory' ? WARNING : nfz.restrictionLevel === 'conditional' ? URGENT : CRITICAL;
                const paths = nfz.polygon.map(p => ({ lat: p.latitude, lng: p.longitude }));
                return (
                  <Polygon
                    key={nfz.id || `nfz-${i}`}
                    paths={paths}
                    strokeColor={zoneColor}
                    onClick={(event) => setInfo({
                      position: { lat: event.latLng.lat(), lng: event.latLng.lng() },
                      body: <p className="text-xs font-mono font-bold" style={{ color: zoneColor }}>{nfz.name} ({nfz.restrictionLevel || 'restricted'})</p>
                    })}
                  />
                );
              })}

              {activeIncidents.map((inc) => (
                <React.Fragment key={`inc-${inc.id}`}>
                  <AdvancedMarker
                    position={{ lat: inc.latitude, lng: inc.longitude }}
                    onClick={() => setInfo({
                      position: { lat: inc.latitude, lng: inc.longitude },
                      body: (
                        <div className="text-xs font-mono font-semibold">
                          <p className="font-bold text-status-critical">{inc.title}</p>
                          <p>Status: {inc.status.toUpperCase()}</p>
                          <p>Severity: {inc.severity.toUpperCase()}</p>
                        </div>
                      )
                    })}
                  >
                    {incidentMarker(inc.severity)}
                  </AdvancedMarker>
                  {inc.status !== 'resolved' && (
                    <Circle center={{ lat: inc.latitude, lng: inc.longitude }} radius={800} strokeColor={CRITICAL} strokeWeight={1} fillOpacity={0.04} />
                  )}
                </React.Fragment>
              ))}

              {drones.map((drone) => (
                <AdvancedMarker
                  key={`drone-${drone.id}`}
                  position={{ lat: drone.latitude, lng: drone.longitude }}
                  onClick={() => {
                    selectDrone(drone);
                    setInfo({
                      position: { lat: drone.latitude, lng: drone.longitude },
                      body: (
                        <div className="text-xs font-mono font-semibold">
                          <p className="font-bold">{drone.call_sign}</p>
                          <p>Status: {drone.status}</p>
                          <p>Battery: {drone.battery_level.toFixed(0)}% | Alt: {drone.altitude.toFixed(0)}m</p>
                          <p>Speed: {drone.speed.toFixed(0)} m/s | Hdg: {drone.heading.toFixed(0)}°</p>
                        </div>
                      )
                    });
                  }}
                >
                  {droneMarker(drone.heading, drone.status)}
                </AdvancedMarker>
              ))}

              {/* Route lines. Dashed, static — direction of travel is already
                  legible from the drone's own heading arrow, so a static dash
                  pattern loses no information and needs no motion guard. */}
              {drones.map((drone) => {
                if (FLYING_STATUSES.includes(drone.status) && drone.current_incident_id) {
                  const inc = incidents.find(i => i.id === drone.current_incident_id);
                  if (inc && !HOLDING_STATUSES.includes(drone.status)) {
                    return (
                      <Polyline
                        key={`line-${drone.id}`}
                        path={[{ lat: drone.latitude, lng: drone.longitude }, { lat: inc.latitude, lng: inc.longitude }]}
                        strokeColor={ACCENT}
                        strokeWeight={1.5}
                        dashed
                      />
                    );
                  }
                }
                if (drone.status === 'Returning') {
                  return (
                    <Polyline
                      key={`ret-${drone.id}`}
                      path={[{ lat: drone.latitude, lng: drone.longitude }, { lat: drone.base_latitude, lng: drone.base_longitude }]}
                      strokeColor={WARNING}
                      strokeWeight={1.5}
                      dashed
                    />
                  );
                }
                return null;
              })}

              {selectedDroneId && droneHistory.length > 1 && (
                <Polyline
                  path={[...droneHistory].reverse().map(h => ({ lat: h.latitude, lng: h.longitude }))}
                  strokeColor={ACCENT}
                  strokeOpacity={0.5}
                  strokeWeight={1.2}
                  dashed
                />
              )}

              {info && (
                <InfoWindow position={info.position} onCloseClick={() => setInfo(null)}>
                  {info.body}
                </InfoWindow>
              )}
            </GoogleMap>
          </APIProvider>
        )}
      </div>

      <footer className="h-10 bg-surface border-t border-border flex items-center px-4 justify-between font-mono text-[9px] text-muted select-none flex-shrink-0">
        <span>FLEET DECISION ENGINE: ACTIVE</span>
        <div className="flex gap-4">
          <span>ENERGY MODEL: SIMULATED</span>
          <span>SAFETY RESERVE: 20%</span>
        </div>
      </footer>
    </section>
  );
}
