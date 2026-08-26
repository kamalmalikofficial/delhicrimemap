import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

window.L = L;
import "../data/leaflet-heat.js"; 

function HeatMap({ crimes }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !crimes || crimes.length === 0) {
      console.log("HeatMap: No crimes array provided or it's empty.");
      return;
    }

    // Print a single raw crime item to the console so we can inspect its exact keys
    console.log("DIAGNOSTIC - Sample Crime Object Structure:", crimes[0]);

    const now = new Date();
    const MS_IN_A_DAY = 24 * 60 * 60 * 1000;

    const points = crimes
      .map((crime) => {
        const lat = Number(crime.latitude);
        const lng = Number(crime.longitude);
        if (isNaN(lat) || isNaN(lng)) return null;

        // 1. LOOK HERE: Try to catch whatever timestamp key your backend uses
        // Mongoose usually creates 'createdAt'. Let's fallback gracefully.
        const rawDate = crime.createdAt || crime.timestamp || crime.timestamps;
        
        if (!rawDate) {
          console.warn("Missing timestamp field! Check your schema keys.");
          return null;
        }

        const crimeDate = new Date(rawDate); 
        if (isNaN(crimeDate.getTime())) return null; 

        const timeDiff = now - crimeDate;
        const daysAgo = timeDiff / MS_IN_A_DAY;

        // --- TEMPORARY TEST BYPASS ---
        // If your test database contains old mock data, the code drops it here.
        // Let's print out how old the data actually is:
        // console.log(`Crime happened ${daysAgo.toFixed(1)} days ago`);
        
        if (daysAgo >= 8 || daysAgo < 0) return null; 
        // ------------------------------

        const intensity = 1 - (daysAgo / 8);
        return [lat, lng, intensity]; 
      })
      .filter(Boolean);

    console.log(`DIAGNOSTIC - Active points within 8-day window: ${points.length}`);

    if (points.length === 0) {
      console.error("CRITICAL: 0 heatmap points generated. Your database entries might all be older than 8 days!");
      return;
    }

    const heatLayer = L.heatLayer(points, {
      radius: 45,       
      blur: 15,         
      maxZoom: 12,
      max: 1.0,         
      gradient: {       
        0.3: "blue",
        0.4: "cyan",
        0.6: "lime",
        0.8: "yellow",
        0.99: "red"                 
      }
    }).addTo(map);

    return () => {
      if (map && heatLayer) {
        map.removeLayer(heatLayer);
      }
    };
  }, [map, crimes]);

  return null;
}

export default HeatMap;