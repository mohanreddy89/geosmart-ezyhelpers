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
      try {
        const { data: locData, error: locError } = await supabase.from('localities').select('*');
        const { data: aptData, error: aptError } = await supabase.from('apartments').select('*');
        
        if (locError) console.error('Error fetching localities:', locError);
        if (aptError) console.error('Error fetching apartments:', aptError);

        if (locData) setLocalities(locData);
        if (aptData) setApartments(aptData);
      } catch (err) {
        console.error('Failed to communicate with database:', err);
      }
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

    try {
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
      console.error('Transit fetching error:', e);
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
      {/* Top Navigation Floating Container */}
      <div className="absolute top-4 left-4 z-10 flex flex-col sm:flex-row flex-wrap gap-2 max-w-lg bg-white/90 backdrop-blur-md p-2 rounded-xl shadow-lg border border-gray-200">
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Search apartment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm focus:outline-none rounded-lg bg-gray-50 border border-gray-200 focus:bg-white transition-all"
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 w-full bg-white border border-gray-200 mt-1 rounded-lg shadow-xl max-h-48 overflow-y-auto z-20">
              {searchResults.map((apt) => (
                <div
                  key={apt.id}
                  onClick={() => handleSelectApartment(apt)}
                  className="p-2 text-xs hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
                >
                  <span className="font-semibold block text-gray-800">{apt.name}</span>
                  <span className="text-gray-500">{apt.locality}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleReset}
          className="bg-gray-900 hover:bg-black text-white font-medium py-2 px-3 rounded-lg shadow-sm text-xs transition-all active:scale-95"
        >
          Reset / Home
        </button>

        {/* Transit Buttons */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs">
          {(['metro', 'bus', 'rail', 'auto'] as const).map((type) => (
            <button
              key={type}
              onClick={() => toggleTransitLayer(type)}
              className={`px-2.5 py-1 rounded-md capitalize font-medium transition-all ${
                transitLayers[type]
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        {loadingTransit && (
          <span className="text-xs text-blue-600 font-semibold self-center px-1 animate-pulse">
            Loading...
          </span>
        )}
      </div>

      {/* Map Component Container */}
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
        <div className="w-full md:w-80 bg-white/95 backdrop-blur-md p-5 shadow-2xl overflow-y-auto max-h-[40vh] md:max-h-full z-10 border-t md:border-t-0 md:border-l border-gray-200 transition-all">
          <div className="flex justify-between items-start mb-1">
            <h2 className="text-xl font-bold text-gray-900 leading-tight">{selectedLocality.locality}</h2>
            <button
              onClick={handleReset}
              className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1 rounded"
              title="Close Panel"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-5">Pincode: {selectedLocality.pincode}</p>

          <div className="mb-5">
            <h3 className="font-semibold text-xs text-gray-500 mb-2.5 uppercase tracking-wider">
              Apartments ({filteredApartments.length})
            </h3>
            <ul className="space-y-1.5">
              {filteredApartments.map((apt) => (
                <li
                  key={apt.id}
                  onClick={() => setSelectedApartment(apt)}
                  className={`text-xs p-2.5 rounded-lg cursor-pointer transition-all ${
                    selectedApartment?.id === apt.id
                      ? 'bg-blue-50 border border-blue-200 text-blue-700 font-bold shadow-sm'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  {apt.name}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-xs text-gray-500 mb-2.5 uppercase tracking-wider">
              Adjacent Localities (&le; 3.5 km)
            </h3>
            <ul className="space-y-1.5">
              {adjacentLocalities.map((adj) => (
                <li
                  key={adj.id}
                  onClick={() => handleSelectLocality(adj)}
                  className="text-xs text-orange-700 font-medium bg-orange-50/80 border border-orange-200/60 p-2.5 rounded-lg cursor-pointer hover:bg-orange-100 transition-all"
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