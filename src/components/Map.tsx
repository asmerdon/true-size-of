import React, { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import DraggablePolygon from './DraggablePolygon';
import { BoundaryData } from '../types';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapProps {
  boundaries: BoundaryData[];
  onBoundaryUpdate: (index: number, newCoordinates: number[][][]) => void;
}

// Available tile providers
const tileProviders = {
  positron: {
    name: 'Clean (Positron)',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd'
  },
  voyager: {
    name: 'Detailed (Voyager)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd'
  },
  terrain: {
    name: 'Natural (Terrain)',
    url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png',
    attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.',
    subdomains: 'abcd'
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  }
};

const Map: React.FC<MapProps> = ({ boundaries, onBoundaryUpdate }) => {
  const [selectedTile, setSelectedTile] = useState<keyof typeof tileProviders>('positron');
  const defaultCenter: [number, number] = [51.505, -0.09];
  const defaultZoom = 13;

  const currentTile = tileProviders[selectedTile];

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      {/* Tile selector */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        background: 'white',
        padding: '8px',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        fontSize: '12px'
      }}>
        <select 
          value={selectedTile} 
          onChange={(e) => setSelectedTile(e.target.value as keyof typeof tileProviders)}
          style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '2px' }}
        >
          {Object.entries(tileProviders).map(([key, provider]) => (
            <option key={key} value={key}>{provider.name}</option>
          ))}
        </select>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution={currentTile.attribution}
          url={currentTile.url}
          {...(('subdomains' in currentTile) && { subdomains: (currentTile as any).subdomains })}
          maxZoom={20}
        />
        
        {boundaries.map((boundary, index) => (
          <DraggablePolygon
            key={`${boundary.name}-${index}`}
            coordinates={boundary.coordinates}
            name={boundary.name}
            color={`hsl(${(index * 137.5) % 360}, 70%, 50%)`}
            onDragEnd={(newCoordinates) => onBoundaryUpdate(index, newCoordinates)}
          />
        ))}
      </MapContainer>
    </div>
  );
};

export default Map;
