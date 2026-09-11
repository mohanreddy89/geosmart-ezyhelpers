export interface Locality {
  id: number;
  locality: string;
  pincode: string;
  district: string;
  rep_lat: number;
  rep_lon: number;
  state: string;
  apartment_count: number;
}

export interface Apartment {
  id: number;
  name: string;
  locality: string;
  lat: number;
  lon: number;
}

export interface TransitPOI {
  id: number;
  type: 'metro' | 'bus' | 'rail' | 'auto';
  name: string;
  lat: number;
  lon: number;
}