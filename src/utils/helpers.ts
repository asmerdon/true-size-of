// Calculate area of a polygon using spherical excess formula (for geographic coordinates)
// Uses the shoelace formula adapted for spherical coordinates
export const calculateArea = (coordinates: number[][][]): number => {
  if (coordinates.length === 0) return 0;
  
  let totalArea = 0;
  const R = 6371; // Earth radius in km
  
  coordinates.forEach(ring => {
    if (ring.length < 3) return;
    
    // Ensure ring is closed
    const closedRing = [...ring];
    if (closedRing[0][0] !== closedRing[closedRing.length - 1][0] || 
        closedRing[0][1] !== closedRing[closedRing.length - 1][1]) {
      closedRing.push(closedRing[0]);
    }
    
    let area = 0;
    for (let i = 0; i < closedRing.length - 1; i++) {
      const [lon1, lat1] = closedRing[i];
      const [lon2, lat2] = closedRing[i + 1];
      
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const lat1Rad = lat1 * Math.PI / 180;
      const lat2Rad = lat2 * Math.PI / 180;
      
      area += dLon * (2 + Math.sin(lat1Rad) + Math.sin(lat2Rad));
    }
    
    area = Math.abs(area * R * R / 2);
    totalArea += area;
  });
  
  return totalArea;
};

// Format area for display
export const formatArea = (areaKm2: number): string => {
  if (areaKm2 >= 1000000) {
    return `${(areaKm2 / 1000000).toFixed(2)}M km²`;
  } else if (areaKm2 >= 1000) {
    return `${(areaKm2 / 1000).toFixed(2)}K km²`;
  } else {
    return `${areaKm2.toFixed(2)} km²`;
  }
};

// Get country code from display name (simple extraction)
export const extractCountryCode = (displayName: string): string | undefined => {
  // Try to extract country code from Nominatim result
  // This is a simple approach - could be improved with a proper country code lookup
  const parts = displayName.split(',');
  const lastPart = parts[parts.length - 1]?.trim();
  
  // Common country name to code mapping (simplified)
  const countryMap: Record<string, string> = {
    'United States': 'US',
    'United Kingdom': 'GB',
    'United States of America': 'US',
    'New Zealand': 'NZ',
    'Australia': 'AU',
    'Canada': 'CA',
    'France': 'FR',
    'Germany': 'DE',
    'Italy': 'IT',
    'Spain': 'ES',
    'Japan': 'JP',
    'China': 'CN',
    'India': 'IN',
    'Brazil': 'BR',
    'Russia': 'RU',
    'Mexico': 'MX',
    'Argentina': 'AR',
    'South Africa': 'ZA',
    'Egypt': 'EG',
    'Nigeria': 'NG',
  };
  
  // Check if last part matches a country name
  for (const [country, code] of Object.entries(countryMap)) {
    if (lastPart?.includes(country)) {
      return code;
    }
  }
  
  return undefined;
};

// Get flag emoji from country code
// Using regional indicator symbols (flag emojis)
export const getFlagEmoji = (countryCode?: string): string => {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  
  const upperCode = countryCode.toUpperCase();
  
  // Convert country code to regional indicator symbols
  // A = U+1F1E6, B = U+1F1E7, etc.
  const base = 0x1F1E6; // Regional Indicator Symbol Letter A
  const codePoints = upperCode
    .split('')
    .map(char => base + (char.charCodeAt(0) - 65)); // 65 is 'A' in ASCII
  
  try {
    return String.fromCodePoint(...codePoints);
  } catch (e) {
    // Fallback: return country code if emoji fails
    return upperCode;
  }
};
