import axios from 'axios';
import { NominatimResult, OverpassResponse, BoundaryData } from '../types';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

// Simplify geometry by reducing point count (Douglas-Peucker-like simplification)
const simplifyGeometry = (coords: number[][], tolerance: number = 0.0001): number[][] => {
  if (coords.length <= 2) return coords;
  
  // Simple distance-based simplification
  const simplified: number[][] = [coords[0]];
  
  for (let i = 1; i < coords.length - 1; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const next = coords[i + 1];
    
    // Calculate distance from current point to line between prev and next
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const dist = Math.abs((dy * curr[0] - dx * curr[1] + next[0] * prev[1] - next[1] * prev[0]) / Math.sqrt(dx * dx + dy * dy));
    
    if (dist > tolerance) {
      simplified.push(curr);
    }
  }
  
  simplified.push(coords[coords.length - 1]);
  return simplified;
};

export const searchLocation = async (query: string): Promise<NominatimResult[]> => {
  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        q: query,
        format: 'json',
        limit: 5,
        addressdetails: 1
      }
    });
    return response.data;
  } catch (error) {
    throw new Error('Failed to search location');
  }
};

export const fetchBoundary = async (osmId: number, osmType: string): Promise<BoundaryData | null> => {
  try {
    // Try Overpass API first - handle both relations and ways
    // Most administrative boundaries are relations (multi-polygons)
    const queries = [
      // Try as relation first (most common for admin boundaries)
      `
      [out:json][timeout:25];
      (
        relation(${osmId});
      );
      (._;>;);
      out geom;
      `,
      // Fallback: try as way
      `
      [out:json][timeout:25];
      (
        way(${osmId});
      );
      (._;>;);
      out geom;
      `,
      // Original simple query as last resort
      `
      [out:json][timeout:15];
      ${osmType}(${osmId});
      out geom;
      `
    ];

    for (const query of queries) {
      for (const server of OVERPASS_SERVERS) {
        try {
          const response = await axios.post(server, query.trim(), {
            headers: {
              'Content-Type': 'text/plain',
            },
            timeout: 30000
          });

          const data: OverpassResponse = response.data;
          
          if (data.elements && data.elements.length > 0) {
            const coordinates: number[][][] = [];
            let center: [number, number] = [0, 0];
            let totalPoints = 0;

            // Process elements - filter to avoid duplicates
            // For relations, we only want the member ways (not the relation itself)
            // Relations themselves don't have geometry, only their member ways do
            const processedIds = new Set<number>();
            
            data.elements.forEach(element => {
              // Skip relation elements - they don't have meaningful geometry
              // Only process ways which contain the actual boundary geometry
              if (element.type === 'relation') {
                return; // Skip relation elements, only process their member ways
              }
              
              // Skip if we've already processed this element (avoid duplicates)
              if (processedIds.has(element.id)) {
                return;
              }
              
              if (element.geometry && element.geometry.length > 0) {
                // Use original detailed coordinates - no automatic simplification
                // Simplification will only happen as a fallback if rendering is too slow
                const coords = element.geometry.map(point => [point.lon, point.lat]);
                
                // Ensure polygon is closed (first point = last point)
                if (coords.length > 0) {
                  const firstCoord = coords[0];
                  const lastCoord = coords[coords.length - 1];
                  if (firstCoord[0] !== lastCoord[0] || firstCoord[1] !== lastCoord[1]) {
                    coords.push([firstCoord[0], firstCoord[1]]);
                  }
                }
                coordinates.push(coords);
                processedIds.add(element.id);
                
                element.geometry.forEach(point => {
                  center[0] += point.lon;
                  center[1] += point.lat;
                  totalPoints++;
                });
              }
            });

            if (coordinates.length > 0) {
              center[0] /= totalPoints;
              center[1] /= totalPoints;

              console.log(`Successfully fetched boundary for ${osmType} ${osmId}: ${coordinates.length} rings, ${totalPoints} points`);
              console.log(`Element types in response:`, data.elements.map(e => e.type).join(', '));
              
              return {
                coordinates,
                name: `Location ${osmId}`,
                center
              };
            }
          }
        } catch (error: any) {
          console.warn(`Overpass query failed on ${server}:`, error.message);
          continue; // Try next server
        }
      }
    }

    // Fallback to bounding box
    const nominatimResponse = await axios.get(`${NOMINATIM_BASE_URL}/lookup`, {
      params: {
        osm_ids: `${osmType.charAt(0).toUpperCase()}${osmId}`,
        format: 'json',
        addressdetails: 1
      }
    });

    if (nominatimResponse.data && nominatimResponse.data.length > 0) {
      const place = nominatimResponse.data[0];
      const bbox = place.boundingbox;
      
      if (bbox && bbox.length === 4) {
        const [minLat, maxLat, minLon, maxLon] = bbox.map(Number);
        
        const coordinates = [[
          [minLon, minLat],
          [maxLon, minLat],
          [maxLon, maxLat],
          [minLon, maxLat],
          [minLon, minLat]
        ]];

        const center: [number, number] = [
          (minLon + maxLon) / 2,
          (minLat + maxLat) / 2
        ];

        return {
          coordinates,
          name: place.display_name,
          center
        };
      }
    }

    return null;
  } catch (error) {
    throw new Error('Failed to fetch boundary data');
  }
};
