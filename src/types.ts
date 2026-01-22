export interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: string[];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  icon?: string;
}

export interface OverpassElement {
  type: string;
  id: number;
  geometry?: Array<{
    lat: number;
    lon: number;
  }>;
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  elements: OverpassElement[];
}

export interface BoundaryData {
  coordinates: number[][][];
  name: string;
  center: [number, number];
  area?: number; // Area in km²
  countryCode?: string; // ISO country code for flag
}
