# True Size Of - Location Comparison Tool

A web application that allows you to compare the true size of locations by dragging their boundaries across a world map. Inspired by [The True Size Of](https://thetruesize.com/), this tool extends the concept to work with any location you can search for.

## Features

- **Location Search**: Search for any place using OpenStreetMap's Nominatim service
- **Boundary Display**: View the geographic boundaries of locations as clean outlines
- **Drag & Drop**: Drag boundaries to any region of the world to compare sizes
- **Multiple Locations**: Load multiple locations simultaneously for comparison
- **Multiple Map Styles**: Choose from Clean, Detailed, or Satellite map views
- **Responsive Design**: Works on desktop and mobile devices

## How It Works

1. **Search**: Enter a location name (e.g., "London", "New York", "Tokyo")
2. **Load**: The app fetches the geographic boundary data from OpenStreetMap
3. **Compare**: Drag the boundary to any region to see how it compares in size
4. **Explore**: Load multiple locations to compare their relative sizes

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Mapping**: Leaflet with React-Leaflet
- **Geocoding**: OpenStreetMap Nominatim API
- **Boundary Data**: OpenStreetMap Overpass API (with fallback to bounding boxes)
- **Styling**: CSS with responsive design

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd true-size-of-2
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
```

## API Usage

The app uses two main APIs:

- **Nominatim**: For geocoding (converting place names to coordinates)
- **Overpass**: For fetching geographic boundary data (with fallback to bounding boxes)

These are free, public APIs provided by OpenStreetMap. No API keys are required.

## Usage Tips

- **Search Specificity**: More specific searches (e.g., "London, UK" instead of just "London") often yield better results
- **Boundary Types**: The app works best with administrative boundaries (countries, states, cities)
- **Drag Behavior**: Click and drag boundaries to move them around the map
- **Multiple Locations**: Load several locations to compare their sizes simultaneously
- **Map Styles**: Use the tile selector to choose different map views

## Current Implementation

The app currently uses a simplified approach for reliability:
- **Primary**: Attempts to fetch detailed boundaries from Overpass API
- **Fallback**: Uses bounding boxes when complex boundaries fail
- **Rendering**: Clean outline-only polygons for consistent appearance
- **Performance**: Fast, reliable rendering without complex geometry issues

## Limitations

- **Data Availability**: Not all locations have detailed boundary data available
- **API Rate Limits**: The free APIs have rate limits that may affect heavy usage
- **Boundary Complexity**: Very complex boundaries fall back to simple rectangles
- **Mobile Performance**: Large boundaries may be slower to render on mobile devices

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve the application.

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Inspired by [The True Size Of](https://thetruesize.com/)
- Built with data from [OpenStreetMap](https://www.openstreetmap.org/)
- Uses [Leaflet](https://leafletjs.com/) for mapping functionality
