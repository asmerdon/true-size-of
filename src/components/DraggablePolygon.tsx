import React, { useEffect, useRef, useState } from 'react';
import { Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';

interface DraggablePolygonProps {
  coordinates: number[][][];
  color?: string;
  name: string;
  onDragEnd?: (newCoordinates: number[][][]) => void;
}

// Calculate center of polygon
const calculateCenter = (positions: L.LatLng[][]): L.LatLng => {
  let totalLat = 0;
  let totalLng = 0;
  let count = 0;
  
  positions.forEach(ring => {
    ring.forEach(pos => {
      totalLat += pos.lat;
      totalLng += pos.lng;
      count++;
    });
  });
  
  return new L.LatLng(totalLat / count, totalLng / count);
};

// Mercator projection scale factor to maintain true area
// In Mercator, area scales as 1/cos(lat)^2, so to maintain area we scale by cos(original_lat)/cos(new_lat)
const getMercatorScale = (originalLat: number, newLat: number): number => {
  const originalCos = Math.cos((originalLat * Math.PI) / 180);
  const newCos = Math.cos((newLat * Math.PI) / 180);
  if (newCos === 0) return 1; // Avoid division by zero at poles
  return originalCos / newCos;
};

const DraggablePolygon: React.FC<DraggablePolygonProps> = ({
  coordinates,
  color = '#007bff',
  name,
  onDragEnd
}) => {
  const map = useMap();
  const polygonRef = useRef<L.Polygon>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<L.LatLng | null>(null);
  const [originalPositions, setOriginalPositions] = useState<L.LatLng[][]>([]);
  const [originalCenter, setOriginalCenter] = useState<L.LatLng | null>(null);

  useEffect(() => {
    const positions = coordinates.map(ring => 
      ring.map(coord => new L.LatLng(coord[1], coord[0]))
    );
    setOriginalPositions(positions);
    setOriginalCenter(calculateCenter(positions));
  }, [coordinates]);

  useEffect(() => {
    if (polygonRef.current) {
      const polygon = polygonRef.current;
      
      const handleMouseDown = (e: L.LeafletMouseEvent) => {
        e.originalEvent.preventDefault();
        e.originalEvent.stopPropagation();
        
        setIsDragging(true);
        setDragStart(e.latlng);
        map.dragging.disable();
      };

      const handleMouseMove = (e: L.LeafletMouseEvent) => {
        if (isDragging && dragStart && originalPositions.length > 0 && originalCenter) {
          e.originalEvent.preventDefault();
          
          const offset = {
            lat: e.latlng.lat - dragStart.lat,
            lng: e.latlng.lng - dragStart.lng
          };

          // Calculate new center
          const newCenter = new L.LatLng(
            originalCenter.lat + offset.lat,
            originalCenter.lng + offset.lng
          );

          // Calculate Mercator scale factor to maintain true area
          const scale = getMercatorScale(originalCenter.lat, newCenter.lat);

          // Transform positions: translate and scale to maintain true size
          // In Mercator projection, area scales as 1/cos²(lat)
          // To preserve true area when moving from originalLat to newLat:
          // Scale factor = cos(originalLat) / cos(newLat) for area
          // For linear dimensions, we use the square root
          const linearScale = Math.sqrt(Math.abs(scale)); // Use absolute to handle negative cos values
          
          const newPositions = originalPositions.map(ring =>
            ring.map(pos => {
              // Calculate offset from original center
              const latOffset = pos.lat - originalCenter.lat;
              const lngOffset = pos.lng - originalCenter.lng;
              
              // Apply scaling and translation
              // Scale both dimensions equally to preserve shape
              return new L.LatLng(
                newCenter.lat + latOffset * linearScale,
                newCenter.lng + lngOffset * linearScale
              );
            })
          );

          polygon.setLatLngs(newPositions);
        }
      };

      const handleMouseUp = () => {
        if (isDragging && onDragEnd && polygonRef.current) {
          const finalPositions = polygon.getLatLngs() as L.LatLng[][];
          const newCoordinates = finalPositions.map(ring =>
            ring.map(latLng => [latLng.lng, latLng.lat])
          );
          
          onDragEnd(newCoordinates);
          setOriginalPositions(finalPositions);
        }
        
        setIsDragging(false);
        setDragStart(null);
        map.dragging.enable();
      };

      polygon.on('mousedown', handleMouseDown);
      map.on('mousemove', handleMouseMove);
      map.on('mouseup', handleMouseUp);

      return () => {
        polygon.off('mousedown', handleMouseDown);
        map.off('mousemove', handleMouseMove);
        map.off('mouseup', handleMouseUp);
        map.dragging.enable();
      };
    }
  }, [map, isDragging, dragStart, originalPositions, originalCenter, onDragEnd]);

  const leafletPositions = coordinates.map(ring => 
    ring.map(coord => [coord[1], coord[0]] as [number, number])
  );

  // Use useEffect to ensure polygon is fully interactive after render
  useEffect(() => {
    if (polygonRef.current) {
      const polygon = polygonRef.current;
      // Ensure the polygon fill is interactive
      // Use a higher opacity to ensure reliable click detection across the entire area
      polygon.setStyle({
        fillOpacity: 0.15, // Higher opacity ensures clicks work everywhere, still visually subtle
        fillColor: color
      });
    }
  }, [coordinates, color]);

  return (
    <Polygon
      ref={polygonRef}
      positions={leafletPositions}
      pathOptions={{
        color: color,
        weight: 3,
        fillColor: color, // Use same color as stroke for consistency
        fillOpacity: 0.15, // Higher opacity - ensures reliable click detection, still visually subtle
        interactive: true,
        bubblingMouseEvents: false // Prevent events from bubbling to map
      }}
      eventHandlers={{
        click: () => {
          if (polygonRef.current && originalCenter) {
            // Open popup at the center of the polygon, not at click location
            const popup = L.popup()
              .setLatLng(originalCenter)
              .setContent(name)
              .openOn(map);
          }
        }
      }}
    />
  );
};

export default DraggablePolygon;
