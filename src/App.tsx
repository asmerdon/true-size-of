import React, { useState, useCallback } from 'react';
import SearchBox from './components/SearchBox';
import Map from './components/Map';
import { NominatimResult, BoundaryData } from './types';
import { fetchBoundary } from './services/geocoding';
import { calculateArea, formatArea, extractCountryCode, getFlagEmoji } from './utils/helpers';
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
        // Calculate area
        boundaryData.area = calculateArea(boundaryData.coordinates);
        // Extract country code for flag
        boundaryData.countryCode = extractCountryCode(result.display_name);
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
      prev.map((boundary, i) => {
        if (i === index) {
          const updated = { ...boundary, coordinates: newCoordinates };
          // Recalculate area when boundary is moved
          updated.area = calculateArea(newCoordinates);
          return updated;
        }
        return boundary;
      })
    );
  }, []);

  const removeBoundary = useCallback((index: number) => {
    setBoundaries(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearBoundaries = useCallback(() => {
    setBoundaries([]);
    setError(null);
  }, []);

  return (
    <div className="app">
      {/* Floating Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>The True Size Of...</h1>
        </div>
        
        <div className="sidebar-content">
          <SearchBox onLocationSelect={handleLocationSelect} isLoading={isLoading} />
          
          {error && (
            <div className="error-message">
              {error}
              <button onClick={() => setError(null)} className="error-close">×</button>
            </div>
          )}
          
          {boundaries.length > 0 && (
            <div className="boundaries-list">
              {boundaries.map((boundary, index) => (
                <div key={index} className="boundary-card">
                  <div className="boundary-header">
                    <span className="boundary-flag">
                      {getFlagEmoji(boundary.countryCode)}
                    </span>
                    <span className="boundary-name">{boundary.name}</span>
                    <button 
                      className="boundary-remove"
                      onClick={() => removeBoundary(index)}
                      aria-label="Remove boundary"
                    >
                      ×
                    </button>
                  </div>
                  {boundary.area && (
                    <div className="boundary-stats">
                      <div className="stat-item">
                        <span className="stat-icon">📐</span>
                        <span className="stat-value">{formatArea(boundary.area)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {boundaries.length > 0 && (
            <button onClick={clearBoundaries} className="clear-all-button">
              Clear All
            </button>
          )}
        </div>
        
        <div className="sidebar-footer">
          <div className="footer-links">
            <a href="#about">About</a>
            <a href="#how-it-works">How it works</a>
          </div>
          <div className="copyright">
            © {new Date().getFullYear()} True Size Of. All rights reserved.
          </div>
        </div>
      </div>
      
      {/* Map Container */}
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
    </div>
  );
};

export default App;
