import { BoundaryData } from '../types';

interface GeoJsonFeature {
  type: string;
  properties: {
    name: string;
    name_en?: string;
    name_es?: string;
    name_fr?: string;
    iso_a2?: string;
    iso_a3?: string;
    [key: string]: any;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

interface GeoJsonData {
  type: string;
  features: GeoJsonFeature[];
}

// Cache for loaded GeoJSON data
let geoJson: GeoJsonData | null = null;
let nameIndex: Map<string, GeoJsonFeature> | null = null;
let nameLowerIndex: Map<string, GeoJsonFeature> | null = null;
let isLoading = false;
let loadPromise: Promise<void> | null = null;

/**
 * Load and index the GeoJSON data
 */
async function loadGeoJson(): Promise<void> {
  if (geoJson) {
    return; // Already loaded
  }
  
  if (isLoading && loadPromise) {
    return loadPromise; // Already loading
  }
  
  isLoading = true;
  loadPromise = (async () => {
    try {
      // Load from public folder
      // Use process.env.PUBLIC_URL to handle GitHub Pages subpath correctly
      const baseUrl = process.env.PUBLIC_URL || '';
      const response = await fetch(`${baseUrl}/custom.geo.json`);
      if (!response.ok) {
        throw new Error(`Failed to load GeoJSON: ${response.statusText}`);
      }
      
      geoJson = await response.json() as GeoJsonData;
      
      // Create lookup maps for fast searching
      nameIndex = new Map<string, GeoJsonFeature>();
      nameLowerIndex = new Map<string, GeoJsonFeature>();
      
      // Index all features by various name properties
      geoJson.features.forEach(feature => {
        const props = feature.properties;
        
        // Index by primary name
        if (props.name) {
          nameIndex!.set(props.name, feature);
          nameLowerIndex!.set(props.name.toLowerCase(), feature);
        }
        
        // Index by English name
        if (props.name_en) {
          nameLowerIndex!.set(props.name_en.toLowerCase(), feature);
        }
        
        // Index by other language names
        ['name_es', 'name_fr', 'name_de', 'name_it', 'name_pt', 'name_ru', 'name_ja', 'name_zh'].forEach(langKey => {
          if (props[langKey]) {
            nameLowerIndex!.set(props[langKey].toLowerCase(), feature);
          }
        });
        
        // Index by ISO codes
        if (props.iso_a2) {
          nameLowerIndex!.set(props.iso_a2.toLowerCase(), feature);
        }
        if (props.iso_a3) {
          nameLowerIndex!.set(props.iso_a3.toLowerCase(), feature);
        }
      });
    } catch (error) {
      console.warn('Failed to load local GeoJSON file:', error);
      // Create empty maps so the service doesn't break
      nameIndex = new Map();
      nameLowerIndex = new Map();
    } finally {
      isLoading = false;
    }
  })();
  
  return loadPromise;
}

/**
 * Convert GeoJSON geometry to our coordinate format
 */
function convertGeoJsonGeometry(geometry: GeoJsonFeature['geometry']): number[][][] {
  const coordinates: number[][][] = [];
  
  if (geometry.type === 'Polygon') {
    // Polygon: coordinates is number[][][]
    // First array is outer ring, rest are holes
    const polygonCoords = geometry.coordinates as number[][][];
    polygonCoords.forEach(ring => {
      // GeoJSON uses [lon, lat] which matches our format
      // Ensure polygon is closed
      if (ring.length > 0) {
        let closedRing = [...ring];
        const first = closedRing[0];
        const last = closedRing[closedRing.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          closedRing = [...closedRing, [first[0], first[1]]];
        }
        coordinates.push(closedRing);
      }
    });
  } else if (geometry.type === 'MultiPolygon') {
    // MultiPolygon: coordinates is number[][][][]
    // Each element is a polygon
    const multiPolygonCoords = geometry.coordinates as number[][][][];
    multiPolygonCoords.forEach(polygon => {
      polygon.forEach(ring => {
        // Ensure polygon is closed
        if (ring.length > 0) {
          let closedRing = [...ring];
          const first = closedRing[0];
          const last = closedRing[closedRing.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) {
            closedRing = [...closedRing, [first[0], first[1]]];
          }
          coordinates.push(closedRing);
        }
      });
    });
  }
  
  return coordinates;
}

/**
 * Calculate center point from coordinates
 */
function calculateCenter(coordinates: number[][][]): [number, number] {
  let totalLon = 0;
  let totalLat = 0;
  let totalPoints = 0;
  
  coordinates.forEach(ring => {
    ring.forEach(coord => {
      totalLon += coord[0];
      totalLat += coord[1];
      totalPoints++;
    });
  });
  
  return totalPoints > 0 
    ? [totalLon / totalPoints, totalLat / totalPoints]
    : [0, 0];
}

/**
 * Extract country name from a display name string
 * e.g., "London, England, United Kingdom" -> "United Kingdom"
 */
function extractCountryName(displayName: string): string[] {
  const parts = displayName.split(',').map(p => p.trim());
  const candidates: string[] = [];
  
  // Last part is often the country
  if (parts.length > 0) {
    candidates.push(parts[parts.length - 1]);
  }
  
  // Also try second-to-last (for cases like "City, State, Country")
  if (parts.length > 1) {
    candidates.push(parts[parts.length - 2]);
  }
  
  // Add the full string as a candidate
  candidates.push(displayName);
  
  return candidates;
}

/**
 * Search for a country in the local GeoJSON file
 * @param query - Country name, ISO code, or display name to search for
 * @returns BoundaryData if found, null otherwise
 */
export async function searchLocalGeoJson(query: string): Promise<BoundaryData | null> {
  // Ensure GeoJSON is loaded
  await loadGeoJson();
  
  if (!nameLowerIndex || nameLowerIndex.size === 0) {
    return null; // GeoJSON failed to load
  }
  
  const queryTrimmed = query.trim();
  const queryLower = queryTrimmed.toLowerCase();
  
  // If query contains commas, it's likely a city/region, not a country
  // Only do exact match for the full query, don't extract country names
  if (queryTrimmed.includes(',')) {
    // For queries with commas, only try exact match on the full string
    const feature = nameLowerIndex.get(queryLower);
    if (feature) {
      const coordinates = convertGeoJsonGeometry(feature.geometry);
      if (coordinates.length > 0) {
        return {
          coordinates,
          name: feature.properties.name,
          center: calculateCenter(coordinates),
          countryCode: feature.properties.iso_a2
        };
      }
    }
    // Don't extract country names from city names - return null
    return null;
  }
  
  // For queries without commas, try exact match first
  let feature = nameLowerIndex.get(queryLower);
  
  if (!feature) {
    // Try partial match - find the best match
    let bestMatch: { feature: GeoJsonFeature; score: number } | null = null;
    
    // Convert Map entries to array for ES5 compatibility
    const entries = Array.from(nameLowerIndex.entries());
    for (let i = 0; i < entries.length; i++) {
      const [key, value] = entries[i];
      if (key === queryLower) {
        feature = value;
        break;
      } else if (key.includes(queryLower) || queryLower.includes(key)) {
        // Score by length match (prefer longer matches)
        const score = Math.min(key.length, queryLower.length) / Math.max(key.length, queryLower.length);
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { feature: value, score };
        }
      }
    }
    
    if (!feature && bestMatch) {
      feature = bestMatch.feature;
    }
  }
  
  if (feature) {
    const coordinates = convertGeoJsonGeometry(feature.geometry);
    
    if (coordinates.length > 0) {
      return {
        coordinates,
        name: feature.properties.name,
        center: calculateCenter(coordinates),
        countryCode: feature.properties.iso_a2
      };
    }
  }
  
  return null;
}

/**
 * Get all available country names for autocomplete/search suggestions
 */
export async function getAllCountryNames(): Promise<string[]> {
  await loadGeoJson();
  return nameIndex ? Array.from(nameIndex.keys()).sort() : [];
}
