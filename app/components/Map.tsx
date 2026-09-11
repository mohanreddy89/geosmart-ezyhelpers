'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Locality, Apartment, TransitPOI } from '../types';

interface MapProps {
  localities: Locality[];
  apartments: Apartment[];
  transitPois: TransitPOI[];
  selectedLocality: Locality | null;
  selectedApartment: Apartment | null;
  adjacentLocalities: Locality[];
  onSelectLocality: (locality: Locality) => void;
  onZoomChange: (zoom: number) => void;
  currentZoom: number;
}

const BANGALORE_CENTER: [number, number] = [12.9716, 77.5946];

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

function MapEventsHandler({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  useMapEvents({
    zoomend: (e) => {
      onZoomChange(e.target.getZoom());
    },
  });
  return null;
}

export default function Map({
  localities,
  apartments,
  transitPois,
  selectedLocality,
  selectedApartment,
  adjacentLocalities,
  onSelectLocality,
  onZoomChange,
  currentZoom,
}: MapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [icons, setIcons] = useState<{
    orange?: L.Icon;
    green?: L.Icon;
    red?: L.Icon;
  }>({});

  useEffect(() => {
    setIsMounted(true);

    // Fix default marker icon assets for Leaflet in Next.js
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    });

    setIcons({
      orange: new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
        shadowAnchor: [12, 41],
      }),
      green: new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
        shadowAnchor: [12, 41],
      }),
      red: new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
        shadowAnchor: [12, 41],
      }),
    });
  }, []);

  if (!isMounted) return null;

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

      <MapEventsHandler onZoomChange={onZoomChange} />

      {selectedLocality && (
        <>
          <MapController
            center={[Number(selectedLocality.rep_lat), Number(selectedLocality.rep_lon)]}
            zoom={13}
          />
          {/* 3.5 km Radius Visual Overlay */}
          <Circle
            center={[Number(selectedLocality.rep_lat), Number(selectedLocality.rep_lon)]}
            radius={3500}
            pathOptions={{
              color: '#2563eb',
              fillColor: '#3b82f6',
              fillOpacity: 0.12,
              weight: 1.5,
              dashArray: '6, 6',
            }}
          />
        </>
      )}

      {localities.map((loc) => {
        const isAdjacent = adjacentLocalities.some((a) => a.id === loc.id);

        return (
          <Marker
            key={loc.id}
            position={[Number(loc.rep_lat), Number(loc.rep_lon)]}
            {...(isAdjacent && icons.orange ? { icon: icons.orange } : {})}
            eventHandlers={{
              click: () => onSelectLocality(loc),
            }}
          >
            <Popup>
              <div className="p-1">
                <h3 className="font-bold text-sm">{loc.locality}</h3>
                {currentZoom >= 13 && (
                  <p className="text-xs text-gray-600">Pincode: {loc.pincode}</p>
                )}
                <p className="text-xs mt-1">
                  Apartments:{' '}
                  {apartments.filter((a) => a.locality === loc.locality).length}
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {selectedLocality &&
        apartments
          .filter((a) => a.locality === selectedLocality.locality)
          .map((apt) => (
            <Marker
              key={apt.id}
              position={[Number(apt.lat), Number(apt.lon)]}
              {...(icons.green ? { icon: icons.green } : {})}
            >
              <Popup>
                <div className="p-1">
                  <h4 className="font-bold text-xs">{apt.name}</h4>
                  <p className="text-xs text-gray-500">{apt.locality}</p>
                </div>
              </Popup>
            </Marker>
          ))}

      {transitPois.map((poi) => (
        <Marker
          key={`${poi.type}-${poi.id}`}
          position={[Number(poi.lat), Number(poi.lon)]}
          {...(icons.red ? { icon: icons.red } : {})}
        >
          <Popup>
            <div className="p-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-red-600 block">
                {poi.type} Stop
              </span>
              <h4 className="font-bold text-xs">{poi.name}</h4>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}