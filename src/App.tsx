import React, { useState, useCallback } from 'react';
import SearchBox from './components/SearchBox';
import Map from './components/Map';
import Modal from './components/Modal';
import { NominatimResult, BoundaryData } from './types';
import { fetchBoundary } from './services/geocoding';
import { calculateArea, formatArea, extractCountryCode, getFlagEmoji } from './utils/helpers';
import './App.css';

const App: React.FC = () => {
  const [boundaries, setBoundaries] = useState<BoundaryData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

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
          <h1>True Size Of (Any Location)</h1>
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
                    <span className="boundary-flag" role="img" aria-label={boundary.countryCode || 'location'}>
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
            <button className="footer-link" onClick={() => setShowAbout(true)}>About</button>
            <button className="footer-link" onClick={() => setShowHowItWorks(true)}>How it works</button>
          </div>
          <div className="copyright">
            © {new Date().getFullYear()} True Size Of. All rights reserved.
          </div>
        </div>
        
        {/* Modals */}
        <Modal isOpen={showAbout} onClose={() => setShowAbout(false)} title="About">
          <div className="modal-text">
            <p>
              <strong>True Size Of (Any Location)</strong> is a web application that allows you to compare 
              the true size of any location by dragging their boundaries across a world map.
            </p>
            <p>
              Unlike other similar tools that are limited to predefined locations, this version works with 
              <strong> any location</strong> that has boundary data available in OpenStreetMap. Simply search 
              for any place in the world, and if boundary data exists, you can visualize and compare it.
            </p>
            <p>
              The app uses real geographic boundary data from OpenStreetMap, ensuring accurate representations 
              of administrative regions, cities, and countries. When you drag a boundary to different latitudes, 
              the app automatically adjusts for Mercator projection distortion, maintaining true area comparisons.
            </p>
            <p>
              <strong>Data Sources:</strong>
            </p>
            <ul>
              <li>Geocoding: OpenStreetMap Nominatim API</li>
              <li>Boundaries: OpenStreetMap Overpass API</li>
              <li>Mapping: Leaflet with React-Leaflet</li>
            </ul>
            <p>
              This project is open source and available under the MIT License.
            </p>
          </div>
        </Modal>
        
        <Modal isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} title="How it works">
          <div className="modal-text">
            <ol>
              <li>
                <strong>Search for a location:</strong> Type any place name in the search box (e.g., "London", 
                "New York", "Tokyo"). The app searches OpenStreetMap's database for matching locations.
              </li>
              <li>
                <strong>Select from results:</strong> Choose the location you want from the dropdown list of 
                search results.
              </li>
              <li>
                <strong>View the boundary:</strong> The app fetches the geographic boundary data and displays 
                it on the map. The map automatically zooms and centers to show the location.
              </li>
              <li>
                <strong>Drag to compare:</strong> Click and drag any boundary to move it anywhere on the map. 
                The boundary automatically scales to maintain its true area, accounting for Mercator projection 
                distortion.
              </li>
              <li>
                <strong>Compare multiple locations:</strong> Add as many locations as you want to compare their 
                sizes side by side. Each boundary is color-coded for easy identification.
              </li>
              <li>
                <strong>View statistics:</strong> Each location card shows the calculated area in square kilometers, 
                helping you understand the true size of different regions.
              </li>
            </ol>
            <p>
              <strong>Tips:</strong>
            </p>
            <ul>
              <li>More specific searches (e.g., "London, UK" instead of just "London") often yield better results</li>
              <li>The app works best with administrative boundaries (countries, states, cities)</li>
              <li>Not all locations have detailed boundary data available - in those cases, a bounding box is used</li>
              <li>Drag boundaries to different latitudes to see how Mercator projection affects apparent size</li>
            </ul>
          </div>
        </Modal>
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
