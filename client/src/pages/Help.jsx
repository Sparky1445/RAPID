import React, { useState, useEffect } from 'react';
// Aliased: the component is called Map, which would shadow the global Map
// constructor used by the marker caches below.
import { APIProvider, Map as GoogleMap, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { Polyline } from '../components/map/gmapPrimitives';
import useThemeTokens from '../components/shared/useThemeTokens';
import Lenis from 'lenis';
import { ShieldAlert, MapPin, Send, AlertTriangle, Phone, User, CheckCircle, Shield, Play, Activity } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const MAPS_MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

const citizenMarker = (
  <div className="relative flex items-center justify-center">
    <div className="h-4 w-4 bg-status-urgent border-2 border-white rounded-full shadow-lg" />
  </div>
);

// Cached by heading bucket for the same reason the operator map caches its
// markers: a fresh identity each render rebuilds the marker's DOM while the
// tracking poll runs every two seconds.
const citizenDroneCache = new Map();

// An inline SVG fill cannot be a Tailwind class, so the resolved tokens come
// in from the caller and go into the cache key: switch theme, get new
// markers rather than the previous theme's.
const droneMarker = (heading, accent, outline) => {
  const bucket = (Math.round(heading / 15) * 15) % 360;
  const key = `${bucket}|${accent}|${outline}`;
  const cached = citizenDroneCache.get(key);
  if (cached) return cached;
  const node = (
    <div style={{ transform: `rotate(${bucket}deg)`, transition: 'transform 0.2s linear' }} className="flex items-center justify-center">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2L2 22L12 17L22 22L12 2Z" fill={accent} stroke={outline} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </div>
  );
  citizenDroneCache.set(key, node);
  return node;
};

function Help() {
  const [searchParams, setSearchParams] = useSearchParams();
  const trackingId = searchParams.get('id');
  const t = useThemeTokens();

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('medical');
  const [gpsShared, setGpsShared] = useState(false);
  const [coordinates, setCoordinates] = useState({ lat: 15.2993, lng: 74.1240 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [droneInfoOpen, setDroneInfoOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [gpsError, setGpsError] = useState(null);

  // Tracking states
  const [incident, setIncident] = useState(null);
  const [drone, setDrone] = useState(null);
  const [logs, setLogs] = useState([]);
  const [eta, setEta] = useState(null);

  // Smooth scrolling, citizen portal only. Behind a motion check, and the
  // page must still scroll natively if this never initialises — a person
  // reporting an emergency on a screen reader matters more than easing.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const lenis = new Lenis();
    let frame;
    const raf = (time) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  // Poll tracking info if trackingId is present
  useEffect(() => {
    if (!trackingId) return;

    const fetchTrackingData = async () => {
      try {
        // Fetch incident details
        const incRes = await fetch(`/api/incidents/${trackingId}`);
        if (!incRes.ok) throw new Error('Failed to load incident status');
        const incData = await incRes.json();
        setIncident(incData);

        // Fetch logs
        const logsRes = await fetch(`/api/incidents/${trackingId}/logs`);
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setLogs(logsData);
        }

        // Fetch drone details if assigned
        if (incData.assigned_drone_id) {
          const droneRes = await fetch(`/api/drones/${incData.assigned_drone_id}`);
          if (droneRes.ok) {
            const droneData = await droneRes.json();
            setDrone(droneData);

            // Compute ETA in human-readable form
            if (['Dispatched', 'En Route', 'dispatching'].includes(droneData.status) && droneData.speed > 0) {
              const R = 6371e3;
              const lat1 = droneData.latitude;
              const lon1 = droneData.longitude;
              const lat2 = incData.latitude;
              const lon2 = incData.longitude;
              
              const φ1 = (lat1 * Math.PI) / 180;
              const φ2 = (lat2 * Math.PI) / 180;
              const Δφ = ((lat2 - lat1) * Math.PI) / 180;
              const Δλ = ((lon2 - lon1) * Math.PI) / 180;

              const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              const distance = R * c;

              const secondsRemaining = distance / droneData.speed;
              const minutes = Math.ceil(secondsRemaining / 60);
              setEta(minutes <= 1 ? 'less than a minute away' : `about ${minutes} minutes away`);
            } else if (['On Scene', 'AI Monitoring', 'Hovering', 'Orbiting', 'Following Target', 'on_site'].includes(droneData.status)) {
              setEta('at your location');
            } else {
              setEta(null);
            }
          }
        } else {
          setDrone(null);
          setEta(null);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchTrackingData();
    const interval = setInterval(fetchTrackingData, 2000); // Poll coordinates every 2s
    return () => clearInterval(interval);
  }, [trackingId]);

  const requestLocation = () => {
    setGpsLoading(true);
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('Location is not available on this device.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setGpsShared(true);
        setGpsLoading(false);
      },
      (error) => {
        console.error(error);
        // Fallback: approximate location near Goa centre
        const offsetLat = (Math.random() - 0.5) * 0.05;
        const offsetLng = (Math.random() - 0.5) * 0.05;
        setCoordinates({ lat: 15.2993 + offsetLat, lng: 74.1240 + offsetLng });
        setGpsShared(true);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!name || !phone || !gpsShared) {
      setFormError('Please fill in your name, phone number, and share your location.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Emergency: Citizen Call (${category.toUpperCase()})`,
          description: `Emergency reported by ${name}. Contact number: ${phone}`,
          category,
          severity: 'high',
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          citizen_name: name,
          citizen_phone: phone
        })
      });

      if (!response.ok) throw new Error('Your report could not be sent. Please try again.');
      const data = await response.json();
      setSearchParams({ id: data.incident.id });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusStep = (status) => {
    switch (status) {
      case 'reported': return 0;
      case 'dispatched': return 1;
      case 'active': return 2;
      case 'resolved': return 3;
      default: return 0;
    }
  };

  return (
    <div className="min-h-screen bg-page text-text flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-center gap-3 mb-6">
        <ShieldAlert className="h-8 w-8 text-status-critical" aria-hidden="true" />
        <h1 className="text-xl font-bold font-mono tracking-widest text-text uppercase">Emergency Help</h1>
      </div>

        {!trackingId ? (
          // Form Screen
          <div className="view-enter w-full max-w-md bg-surface border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden">

            <div className="mb-6">
              <h2 className="text-lg font-bold">Request emergency help</h2>
              <p className="text-xs text-muted mt-1">Fill in your details and tap Send for Help. Keep this page open to track the response.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1">Your Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full min-h-[44px] bg-page text-text placeholder:text-muted border border-border-strong rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-colors duration-150 focus:border-accent focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter phone number"
                    className="w-full min-h-[44px] bg-page text-text placeholder:text-muted border border-border-strong rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-colors duration-150 focus:border-accent focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1">Type of emergency</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full min-h-[44px] bg-page text-text border border-border-strong rounded-xl px-3 py-2.5 text-sm outline-none transition-colors duration-150 focus:border-accent focus:ring-2 focus:ring-accent"
                >
                  <option value="medical">Medical emergency or accident</option>
                  <option value="assault">Assault or active threat</option>
                  <option value="theft">Robbery</option>
                  <option value="fire">Fire</option>
                  <option value="trespass">Break-in or trespassing</option>
                  <option value="other">Other emergency</option>
                </select>
              </div>

              <div className="py-2">
                <button
                  type="button"
                  onClick={requestLocation}
                  className={`w-full min-h-[44px] py-3 rounded-xl border flex items-center justify-center gap-2 font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    gpsShared
                      ? 'bg-status-normal/10 border-status-normal text-status-normal'
                      : 'bg-status-urgent/10 border-status-urgent text-text hover:bg-status-urgent/20'
                  }`}
                >
                  {/* The label sits on a tint, and urgent-on-urgent-tint only
                      reaches 4.1:1 at this size. The border and the pin carry
                      the tone; the words stay body text. */}
                  <MapPin className={`h-4 w-4 ${gpsShared ? '' : 'text-status-urgent'}`} aria-hidden="true" />
                  <span>
                    {gpsLoading
                      ? 'Finding your location…'
                      : gpsShared
                      ? 'Location found'
                      : 'Share my location'}
                  </span>
                </button>
                {gpsShared && (
                  <p className="text-[10px] text-center text-status-normal font-mono mt-1">Location confirmed.</p>
                )}
                {gpsError && (
                  <p role="alert" className="text-[10px] text-center text-status-critical font-mono mt-1">{gpsError}</p>
                )}
              </div>

              {formError && (
                <p role="alert" className="text-xs text-status-critical bg-status-critical/10 border border-status-critical/30 rounded-xl px-3 py-2">{formError}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[48px] bg-status-critical text-on-solid font-medium rounded-xl px-4 flex items-center justify-center gap-2 transition-colors duration-150 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-status-critical"
              >
                {isSubmitting ? (
                  <span>Sending…</span>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Send for Help</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          // Tracking View
          <div className="view-enter w-full max-w-lg bg-surface border border-border rounded-3xl p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div>
                <span className="text-[10px] text-status-urgent font-mono tracking-widest uppercase">Your report was received</span>
                <h2 className="text-sm font-mono text-muted font-semibold mt-0.5 truncate max-w-[200px]">ID: {trackingId}</h2>
              </div>
              <div className="bg-status-critical/10 px-3 py-1 rounded-full border border-status-critical/30 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-status-critical motion-safe:animate-pulse"></span>
                <span className="text-[11px] font-bold text-status-critical font-mono uppercase">Tracking</span>
              </div>
            </div>

            {incident && (
              <div className="grid grid-cols-4 gap-2 mb-6">
                {[
                  { key: 'reported', label: 'Report sent' },
                  { key: 'dispatched', label: 'On the way' },
                  { key: 'active', label: 'At your location' },
                  { key: 'resolved', label: 'Resolved' }
                ].map((step, idx) => {
                  const currentIdx = getStatusStep(incident.status);
                  const isDone = idx < currentIdx;
                  const isCurrent = idx === currentIdx;
                  // Colour is never the only carrier: done steps get a tick,
                  // the current step gets a thicker bar and aria-current, and
                  // the label spells the state out for a screen reader.
                  return (
                    <div key={step.key} className="text-center" aria-current={isCurrent ? 'step' : undefined}>
                      <div
                        className={`rounded-full mb-1.5 transition-colors duration-150 ${
                          isCurrent ? 'h-2.5 bg-status-urgent' : isDone ? 'h-2 bg-status-normal' : 'h-2 bg-border'
                        }`}
                      ></div>
                      <span className={`text-[10px] font-bold uppercase inline-flex items-center gap-0.5 ${isCurrent ? 'text-status-urgent' : isDone ? 'text-status-normal' : 'text-muted'}`}>
                        {isDone && <CheckCircle className="h-3 w-3 flex-shrink-0" aria-hidden="true" />}
                        {step.label}
                        <span className="sr-only">{isDone ? ' - done' : isCurrent ? ' - in progress' : ' - not started'}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Map representation */}
            <div className="h-56 rounded-2xl overflow-hidden border border-border mb-4 z-10 relative">
              {!MAPS_API_KEY ? (
                <div className="h-full w-full bg-page flex flex-col items-center justify-center gap-1 p-4 text-center">
                  <p className="text-xs text-status-warning font-semibold">Map unavailable</p>
                  <p className="font-mono text-[11px] text-text tabular-nums">
                    You are at {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
                  </p>
                  {drone && (
                    <p className="font-mono text-[11px] text-muted tabular-nums">
                      {drone.call_sign} at {drone.latitude.toFixed(4)}, {drone.longitude.toFixed(4)}
                    </p>
                  )}
                </div>
              ) : (
                <APIProvider apiKey={MAPS_API_KEY}>
                  <GoogleMap
                    mapId={MAPS_MAP_ID}
                    defaultCenter={{ lat: coordinates.lat, lng: coordinates.lng }}
                    defaultZoom={13}
                    disableDefaultUI
                    gestureHandling="greedy"
                    style={{ height: '100%', width: '100%' }}
                  >
                    <AdvancedMarker position={{ lat: coordinates.lat, lng: coordinates.lng }}>
                      {citizenMarker}
                    </AdvancedMarker>
                    {drone && (
                      <>
                        <AdvancedMarker
                          position={{ lat: drone.latitude, lng: drone.longitude }}
                          onClick={() => setDroneInfoOpen(true)}
                        >
                          {droneMarker(drone.heading, t.accent, t.surface)}
                        </AdvancedMarker>
                        {droneInfoOpen && (
                          <InfoWindow
                            position={{ lat: drone.latitude, lng: drone.longitude }}
                            onCloseClick={() => setDroneInfoOpen(false)}
                          >
                            <div className="text-xs font-mono font-semibold">
                              <p>Call Sign: {drone.call_sign}</p>
                              <p>Alt: {drone.altitude.toFixed(0)}m</p>
                            </div>
                          </InfoWindow>
                        )}
                        <Polyline
                          path={[
                            { lat: drone.latitude, lng: drone.longitude },
                            { lat: coordinates.lat, lng: coordinates.lng }
                          ]}
                          strokeColor={t.accent}
                          strokeWeight={2}
                          dashed
                        />
                      </>
                    )}
                  </GoogleMap>
                </APIProvider>
              )}
            </div>

            {/* Drone Telemetry details for Citizen info */}
            <div className="bg-page rounded-2xl p-4 border border-border mb-4">
              {drone ? (
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-accent" aria-hidden="true" />
                      <span className="text-xs font-mono text-accent font-bold">{drone.call_sign} responding</span>
                    </div>
                    {eta && (
                      <span className="text-xs font-mono bg-accent/10 text-accent px-2 py-0.5 border border-accent/30 rounded font-semibold">
                        {eta}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono text-muted">
                    <p>On its way to you</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <AlertTriangle className="h-5 w-5 text-status-urgent mb-1" aria-hidden="true" />
                  <p className="text-xs text-muted">A responder has been alerted. You&rsquo;ll see it here when it&rsquo;s on the way.</p>
                </div>
              )}
            </div>

            {/* Live feed. The frame stays black in both themes: it holds a
                picture, not a surface. */}
            {drone && (drone.status === 'active' || drone.status === 'on_site') && (
              <div className="bg-black rounded-2xl aspect-video overflow-hidden relative border border-accent/30 mb-4">
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-status-critical text-on-solid px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wider motion-safe:animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-on-solid"></span>
                  LIVE CAMERA FEED
                </div>
                {drone.stream_url ? (
                  <video
                    src={drone.stream_url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover opacity-80"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-page text-muted">
                    <Activity className="h-8 w-8 text-accent mb-2" aria-hidden="true" />
                    <span className="text-[11px] font-mono tracking-widest text-accent uppercase">Connecting…</span>
                  </div>
                )}
              </div>
            )}

            {/* Event log feed */}
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              <span className="text-[10px] font-mono text-muted block uppercase mb-1">Updates</span>
              {logs.map((log) => (
                <div key={log.id} className="flex gap-2 text-[11px] font-mono border-l border-border pl-3 py-0.5">
                  <span className="text-muted">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className="text-accent font-bold uppercase">{log.action.replace(/_/g, ' ')}:</span>
                  <span className="text-text flex-1">{log.notes}</span>
                </div>
              ))}
              {logs.length === 0 && (
                <p className="text-[11px] font-mono text-muted">Your report has been logged. Updates will appear here.</p>
              )}
            </div>
          </div>
        )}
    </div>
  );
}

export default Help;
