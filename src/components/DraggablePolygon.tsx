import React, { useEffect, useRef, useState } from 'react';
import { Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';

interface DraggablePolygonProps {
  coordinates: number[][][];
  color?: string;
  name: string;
  onDragEnd?: (newCoordinates: number[][][]) => void;
}

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

  useEffect(() => {
    const positions = coordinates.map(ring => 
      ring.map(coord => new L.LatLng(coord[1], coord[0]))
    );
    setOriginalPositions(positions);
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
        if (isDragging && dragStart && originalPositions.length > 0) {
          e.originalEvent.preventDefault();
          
          const offset = {
            lat: e.latlng.lat - dragStart.lat,
            lng: e.latlng.lng - dragStart.lng
          };

          const newPositions = originalPositions.map(ring =>
            ring.map(pos => new L.LatLng(
              pos.lat + offset.lat,
              pos.lng + offset.lng
            ))
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
  }, [map, isDragging, dragStart, originalPositions, onDragEnd]);

  const leafletPositions = coordinates.map(ring => 
    ring.map(coord => [coord[1], coord[0]] as [number, number])
  );

  return (
    <Polygon
      ref={polygonRef}
      positions={leafletPositions}
      pathOptions={{
        color: color,
        weight: 3,
        fillColor: 'transparent',
        fillOpacity: 0,
        interactive: true
      }}
      eventHandlers={{
        click: () => {
          if (polygonRef.current) {
            polygonRef.current.bindPopup(name).openPopup();
          }
        }
      }}
    />
  );
};

export default DraggablePolygon;
