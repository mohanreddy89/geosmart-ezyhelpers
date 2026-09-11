'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Locality, Apartment } from '../types';

// Fix Leaflet default marker icon issue in Next.js
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Highlighted Icon for Selected/Adjacent Localities
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
};

const BANGALORE_CENTER: [number, number] = [12.9716, 77.5946];
const BANGALORE_BBOX: [[number, number], [number, number]] = [
  [12.7, 77.2],
  [13.35, 77.9],
];

interface MapProps {
  localities: Locality[];
  apartments: Apartment[];
  selectedLocality: Locality | null;
  adjacentLocalities: Locality[];
  onSelectLocality: (locality: Locality) => void;
}

// Controller component to smoothly animate map views
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

export default function Map({
  localities,
  apartments,
  selectedLocality,
  adjacentLocalities,
  onSelectLocality,
}: MapProps) {
  const adjacentNames = adjacentLocalities.map((l) => l.locality);

  return (
    <MapContainer
      center={BANGALORE_CENTER}
      zoom={11}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
        <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

      {selectedLocality && (
        <MapController
          center={[Number(selectedLocality.rep_lat), Number(selectedLocality.rep_lon)]}
          zoom={13}
        />
      )}

      {/* Render Localities */}
      {localities.map((loc) => {
        const isSelected = selectedLocality?.locality === loc.locality;
        const isAdjacent = adjacentNames.includes(loc.locality);

        let icon = createCustomIcon('#1E3A5F'); // EH Blue (default)
        if (isSelected) icon = createCustomIcon('#2563EB'); // Bright Blue
        if (isAdjacent) icon = createCustomIcon('#EA580C'); // Orange Ring

        return (
          <Marker
            key={loc.id}
            position={[Number(loc.rep_lat), Number(loc.rep_lon)]}
            icon={icon}
            eventHandlers={{
              click: () => onSelectLocality(loc),
            }}
          >
            <Popup>
              <div className="p-1">
                <h3 className="font-bold text-sm">{loc.locality}</h3>
                <p className="text-xs text-gray-600">Pincode: {loc.pincode}</p>
                <p className="text-xs text-gray-600">Apartments: {loc.apartment_count}</p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}