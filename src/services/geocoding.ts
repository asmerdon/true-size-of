import axios from 'axios';
import { NominatimResult, OverpassResponse, BoundaryData } from '../types';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

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
    // Try Overpass API first
    const query = `
      [out:json][timeout:15];
      ${osmType}(${osmId});
      out geom;
    `;

    for (const server of OVERPASS_SERVERS) {
      try {
        const response = await axios.get(server, {
          params: { data: query.trim() },
          timeout: 20000
        });

        const data: OverpassResponse = response.data;
        
        if (data.elements && data.elements.length > 0) {
          const coordinates: number[][][] = [];
          let center: [number, number] = [0, 0];
          let totalPoints = 0;

          data.elements.forEach(element => {
            if (element.geometry && element.geometry.length > 0) {
              const coords = element.geometry.map(point => [point.lon, point.lat]);
              coordinates.push(coords);
              
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

            return {
              coordinates,
              name: `Location ${osmId}`,
              center
            };
          }
        }
      } catch (error) {
        continue; // Try next server
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
