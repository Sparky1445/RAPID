import { useEffect, useRef } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

// @vis.gl/react-google-maps ships markers and info windows but no shape
// components, so these three wrap the raw google.maps classes. Each one
// creates its overlay once, updates it in place when its props change, and
// removes it on unmount — recreating the overlay every render would flicker
// against the 1-second telemetry tick.

function useOverlay(factory, deps) {
  const map = useMap();
  const maps = useMapsLibrary('maps');
  const ref = useRef(null);

  useEffect(() => {
    if (!map || !maps) return undefined;
    const overlay = factory(maps);
    overlay.setMap(map);
    ref.current = overlay;
    return () => {
      overlay.setMap(null);
      ref.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, maps, ...deps]);

  return ref;
}

export function Polyline({ path, strokeColor, strokeOpacity = 1, strokeWeight = 2, dashed = false, zIndex }) {
  const key = JSON.stringify(path);
  useOverlay(
    (maps) =>
      new maps.Polyline({
        path,
        zIndex,
        // A dashed line is drawn as repeated symbols along an invisible
        // stroke; google.maps.Polyline has no dashArray equivalent.
        strokeOpacity: dashed ? 0 : strokeOpacity,
        strokeColor,
        strokeWeight,
        icons: dashed
          ? [
              {
                icon: {
                  path: 'M 0,-1 0,1',
                  strokeOpacity,
                  strokeColor,
                  strokeWeight,
                  scale: 3,
                },
                offset: '0',
                repeat: '12px',
              },
            ]
          : undefined,
      }),
    [key, strokeColor, strokeOpacity, strokeWeight, dashed, zIndex]
  );
  return null;
}

export function Circle({ center, radius, strokeColor, strokeWeight = 1, fillOpacity = 0.05, dashed = false }) {
  useOverlay(
    (maps) =>
      new maps.Circle({
        center,
        radius,
        strokeColor,
        strokeWeight,
        strokeOpacity: dashed ? 0.45 : 0.9,
        fillColor: strokeColor,
        fillOpacity,
        clickable: false,
      }),
    [center.lat, center.lng, radius, strokeColor, strokeWeight, fillOpacity, dashed]
  );
  return null;
}

export function Polygon({ paths, strokeColor, strokeWeight = 1.5, fillOpacity = 0.15, onClick }) {
  const key = JSON.stringify(paths);
  const map = useMap();
  const maps = useMapsLibrary('maps');
  const handler = useRef(onClick);
  useEffect(() => {
    handler.current = onClick;
  }, [onClick]);

  useEffect(() => {
    if (!map || !maps) return undefined;
    const polygon = new maps.Polygon({
      paths,
      strokeColor,
      strokeWeight,
      strokeOpacity: 0.9,
      fillColor: strokeColor,
      fillOpacity,
    });
    polygon.setMap(map);
    const listener = polygon.addListener('click', (event) => {
      if (handler.current) handler.current(event);
    });
    return () => {
      listener.remove();
      polygon.setMap(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, maps, key, strokeColor, strokeWeight, fillOpacity]);

  return null;
}

// google.maps.Map honours defaultCenter only on first render, so switching
// the active state has to move the camera imperatively.
export function MapCamera({ center, zoom }) {
  const map = useMap();
  const lat = center?.lat;
  const lng = center?.lng;
  useEffect(() => {
    if (!map || lat == null || lng == null) return;
    map.panTo({ lat, lng });
    map.setZoom(zoom);
  }, [map, lat, lng, zoom]);
  return null;
}
