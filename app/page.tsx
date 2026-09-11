'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from './lib/supabase';
import { Locality, Apartment, TransitPOI } from './types';

const Map = dynamic(() => import('./components/Map'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-500 font-medium text-sm">
      Loading Bangalore Map...
    </div>
  ),
});

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export default function Home() {
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [transitPois, setTransitPois] = useState<TransitPOI[]>([]);
  
  const [selectedLocality, setSelectedLocality] = useState<Locality | null>(null);
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [adjacentLocalities, setAdjacentLocalities] = useState<Locality[]>([]);
  const [filteredApartments, setFilteredApartments] = useState<Apartment[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [currentZoom, setCurrentZoom] = useState(11);
  const [loadingTransit, setLoadingTransit] = useState(false);
  const [transitLayers, setTransitLayers] = useState({
    metro: false,
    bus: false,
    rail: false,
    auto: false,
  });

  useEffect(() => {
    async function fetchData() {
      const { data: locData } = await supabase.from('localities').select('*');
      const { data: aptData } = await supabase.from('apartments').select('*');
      if (locData) setLocalities(locData);
      if (aptData) setApartments(aptData);
    }
    fetchData();
  }, []);

  const toggleTransitLayer = async (type: 'metro' | 'bus' | 'rail' | 'auto') => {
    const newState = !transitLayers[type];
    setTransitLayers((prev) => ({ ...prev, [type]: newState }));

    if (!newState) {
      setTransitPois((prev) => prev.filter((p) => p.type !== type));
      return;
    }

    setLoadingTransit(true);

    const { data: cached } = await supabase.from('transit_pois').select('*').eq('type', type);

    if (cached && cached.length > 0) {
      setTransitPois((prev) => [...prev, ...cached]);
      setLoadingTransit(false);
      return;
    }

    const queries: Record<string, string> = {
      metro: 'node["railway"="station"]["network"="Namma Metro"](12.7,77.2,13.35,77.9);',
      bus: 'node["highway"="bus_stop"]["operator"="BMTC"](12.85,77.5,13.1,77.75);',
      rail: 'node["railway"="station"][!"subway"](12.7,77.2,13.35,77.9);',
      auto: 'node["amenity"="taxi"](12.7,77.2,13.35,77.9);',
    };

    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `[out:json];${queries[type]}out body 25;`,
      });
      const json = await res.json();

      const pois: TransitPOI[] = (json.elements || []).slice(0, 30).map((el: any) => ({
        id: el.id,
        type,
        name: el.tags?.name || `${type.toUpperCase()} Stop`,
        lat: el.lat,
        lon: el.lon,
      }));

      setTransitPois((prev) => [...prev, ...pois]);

      if (pois.length > 0) {
        await supabase.from('transit_pois').insert(pois);
      }
    } catch (e) {
      alert('Transit data temporarily unavailable');
    } finally {
      setLoadingTransit(false);
    }
  };

  const handleSelectLocality = (loc: Locality) => {
    setSelectedLocality(loc);
    setSelectedApartment(null);

    const adj = localities.filter(
      (l) =>
        l.locality !== loc.locality &&
        haversine(
          Number(loc.rep_lat),
          Number(loc.rep_lon),
          Number(l.rep_lat),
          Number(l.rep_lon)
        ) <= 3.5
    );
    setAdjacentLocalities(adj);
    setFilteredApartments(apartments.filter((a) => a.locality === loc.locality));
  };

  const handleSelectApartment = (apt: Apartment) => {
    setSelectedApartment(apt);
    setSearchQuery('');
    const parentLoc = localities.find((l) => l.locality === apt.locality);
    if (parentLoc) handleSelectLocality(parentLoc);
  };

  const handleReset = () => {
    setSelectedLocality(null);
    setSelectedApartment(null);
    setAdjacentLocalities([]);
    setFilteredApartments([]);
    setSearchQuery('');
  };

  const searchResults = searchQuery
    ? apartments.filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <main className="relative w-screen h-screen flex flex-col md:flex-row overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2 max-w-lg">
        <div className="relative bg-white rounded shadow border border-gray-300 w-64">
          <input
            type="text"
            placeholder="Search apartment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm focus:outline-none rounded"
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 w-full bg-white border border-gray-200 mt-1 rounded shadow-lg max-h-48 overflow-y-auto">
              {searchResults.map((apt) => (
                <div
                  key={apt.id}
                  onClick={() => handleSelectApartment(apt)}
                  className="p-2 text-xs hover:bg-blue-50 cursor-pointer border-b"
                >
                  <span className="font-semibold block">{apt.name}</span>
                  <span className="text-gray-500">{apt.locality}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleReset}
          className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-3 border border-gray-300 rounded shadow text-xs"
        >
          Reset / Home
        </button>

        {/* Transit Buttons */}
        <div className="flex gap-1 bg-white p-1 rounded shadow border border-gray-300 text-xs">
          {(['metro', 'bus', 'rail', 'auto'] as const).map((type) => (
            <button
              key={type}
              onClick={() => toggleTransitLayer(type)}
              className={`px-2 py-1 rounded capitalize font-medium ${
                transitLayers[type]
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        {loadingTransit && <span className="text-xs bg-white p-1 rounded shadow">Loading...</span>}
      </div>

      {/* Map Component */}
      <div className="flex-1 h-full w-full">
        <Map
          localities={localities}
          apartments={apartments}
          transitPois={transitPois}
          selectedLocality={selectedLocality}
          selectedApartment={selectedApartment}
          adjacentLocalities={adjacentLocalities}
          onSelectLocality={handleSelectLocality}
          onZoomChange={setCurrentZoom}
          currentZoom={currentZoom}
        />
      </div>

      {/* Right Side Panel */}
      {selectedLocality && (
        <div className="w-full md:w-80 bg-white p-4 shadow-xl overflow-y-auto max-h-[40vh] md:max-h-full z-10 border-l">
          <h2 className="text-xl font-bold text-gray-900">{selectedLocality.locality}</h2>
          <p className="text-xs text-gray-500 mb-4">Pincode: {selectedLocality.pincode}</p>

          <div className="mb-4">
            <h3 className="font-semibold text-xs text-gray-700 mb-2 uppercase tracking-wide">
              Apartments ({filteredApartments.length})
            </h3>
            <ul className="space-y-1">
              {filteredApartments.map((apt) => (
                <li
                  key={apt.id}
                  onClick={() => setSelectedApartment(apt)}
                  className={`text-xs p-2 rounded cursor-pointer ${
                    selectedApartment?.id === apt.id
                      ? 'bg-blue-100 text-blue-800 font-bold'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {apt.name}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-xs text-gray-700 mb-2 uppercase tracking-wide">
              Adjacent Localities (&le; 3.5 km)
            </h3>
            <ul className="space-y-1">
              {adjacentLocalities.map((adj) => (
                <li
                  key={adj.id}
                  onClick={() => handleSelectLocality(adj)}
                  className="text-xs text-orange-600 font-medium bg-orange-50 p-2 rounded cursor-pointer hover:bg-orange-100"
                >
                  {adj.locality} ({adj.pincode})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}