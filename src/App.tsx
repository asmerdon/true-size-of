import React, { useState, useCallback } from 'react';
import SearchBox from './components/SearchBox';
import Map from './components/Map';
import { NominatimResult, BoundaryData } from './types';
import { fetchBoundary } from './services/geocoding';
import './App.css';

const App: React.FC = () => {
  const [boundaries, setBoundaries] = useState<BoundaryData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLocationSelect = useCallback(async (result: NominatimResult) => {
    setIsLoading(true);
    setError(null);

    try {
      const boundaryData = await fetchBoundary(result.osm_id, result.osm_type);
      
      if (boundaryData) {
        boundaryData.name = result.display_name;
        setBoundaries(prev => [...prev, boundaryData]);
      } else {
        setError('No boundary data found for this location. Try searching for a different place.');
      }
    } catch (err) {
      setError('Failed to fetch boundary data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleBoundaryUpdate = useCallback((index: number, newCoordinates: number[][][]) => {
    setBoundaries(prev => 
      prev.map((boundary, i) => 
        i === index 
          ? { ...boundary, coordinates: newCoordinates }
          : boundary
      )
    );
  }, []);

  const clearBoundaries = useCallback(() => {
    setBoundaries([]);
    setError(null);
  }, []);

  return (
    <div className="app">
      <div className="header">
        <h1>True Size Of</h1>
        <p>Compare the true size of locations by dragging boundaries across the map</p>
      </div>
      
      <SearchBox onLocationSelect={handleLocationSelect} isLoading={isLoading} />
      
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}
      
      {boundaries.length > 0 && (
        <div className="controls">
          <button onClick={clearBoundaries} className="clear-button">
            Clear All Boundaries
          </button>
          <span className="boundary-count">
            {boundaries.length} location{boundaries.length !== 1 ? 's' : ''} loaded
          </span>
        </div>
      )}
      
      <div className="map-container">
        {isLoading ? (
          <div className="loading">Loading boundary data...</div>
        ) : (
          <Map 
            boundaries={boundaries} 
            onBoundaryUpdate={handleBoundaryUpdate}
          />
        )}
      </div>
      
      {boundaries.length === 0 && !isLoading && (
        <div className="info-text">
          Search for a location to see its boundary on the map. 
          You can then drag the boundary to compare sizes with other regions.
        </div>
      )}
    </div>
  );
};

export default App;
