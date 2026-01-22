import React, { useState, useEffect, useRef } from 'react';
import { NominatimResult } from '../types';
import { searchLocation } from '../services/geocoding';

interface SearchBoxProps {
  onLocationSelect: (result: NominatimResult) => void;
  isLoading: boolean;
}

const SearchBox: React.FC<SearchBoxProps> = ({ onLocationSelect, isLoading }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setSearching(true);
    try {
      const searchResults = await searchLocation(searchQuery);
      setResults(searchResults);
      setShowResults(true);
    } catch (error) {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

  const handleResultSelect = (result: NominatimResult) => {
    onLocationSelect(result);
    setQuery(result.display_name);
    setShowResults(false);
  };

  return (
    <div className="search-container" ref={resultsRef}>
      <input
        type="text"
        className="search-input"
        placeholder="Search for a location (e.g. London)"
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        disabled={isLoading}
      />
      
      {searching && (
        <div className="loading">Searching...</div>
      )}

      {showResults && results.length > 0 && (
        <div className="search-results">
          {results.map((result) => (
            <div
              key={result.place_id}
              className="search-result-item"
              onClick={() => handleResultSelect(result)}
            >
              <div className="result-name">{result.display_name}</div>
              <div className="result-type">{result.type}</div>
            </div>
          ))}
        </div>
      )}

      {showResults && results.length === 0 && query.length >= 2 && !searching && (
        <div className="no-results">No locations found</div>
      )}
    </div>
  );
};

export default SearchBox;
