import { useEffect, useState } from "react";
import axios from "axios";

import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Polygon,
  useMapEvents,
} from "react-leaflet";

import delhiBoundary from "./data/Delhi_Boundary.json";
import HeatMap from "./compo/heatmap";

import "./App.css";

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: () => {
      onMapClick();
    },
  });

  return null;
}

function App() {
  const [crimes, setCrimes] = useState([]);
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    const fetchCrimes = async () => {
      try {
        const res = await axios.get("http://localhost:3000/api/crime");
        setCrimes(res.data);
      } catch (err) {
        console.error("Error fetching crime data:", err);
      }
    };

    fetchCrimes();
  }, []);

  const delhiCoords =
    delhiBoundary.features[0].geometry.coordinates[0].map(
      ([lng, lat]) => [lat, lng]
    );

  const worldMask = [
    [
      [-90, -180],
      [-90, 180],
      [90, 180],
      [90, -180],
    ],
    delhiCoords,
  ];

  return (
    <div className="app">

      {/* MAP AREA */}
      <div className="map-wrapper">

        {/* HAMBURGER BUTTON */}
        {!panelOpen && (
          <button
            className="menu-button"
            onClick={() => setPanelOpen(true)}
          >
            ☰
          </button>
        )}

        {/* LEFT CONTROL PANEL */}
        <div className={`control-panel ${panelOpen ? "open" : ""}`}>

          <div className="panel-header">
            <div>
              <h1>Delhi Crime Map</h1>
              <p>Live crime visualization</p>
            </div>

            <button
              className="close-button"
              onClick={() => setPanelOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="panel-divider"></div>

          <div className="stat-box">
            <span className="stat-number">{crimes.length}</span>
            <span className="stat-label">Crime Incidents</span>
          </div>

          <div className="panel-section">
            <h3>Map</h3>

            <div className="map-option">
              <span>🔥</span>
              <span>Crime Heatmap</span>
            </div>
          </div>

          <div className="panel-section">
            <h3>Heat Intensity</h3>

            <div className="heat-legend">
              <div className="legend-bar"></div>

              <div className="legend-labels">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>
          </div>

          <div className="panel-bottom">
            <p>Data collected from crime news reports.</p>
          </div>

        </div>

        {/* MAP */}
        <div className="map-container">

          <MapContainer
            center={[28.6139, 77.2090]}
            zoom={11}
            minZoom={10}
            maxZoom={18}
            style={{ height: "100%", width: "100%" }}
          >

            <MapClickHandler
              onMapClick={() => setPanelOpen(false)}
            />

            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            <Polygon
              positions={worldMask}
              pathOptions={{
                fillColor: "black",
                fillOpacity: 0.4,
                stroke: false,
              }}
            />

            <GeoJSON
              data={delhiBoundary}
              style={{
                color: "red",
                weight: 3,
                dashArray: "4, 6",
                fillOpacity: 0.05,
              }}
            />

            <HeatMap crimes={crimes} />

          </MapContainer>

        </div>

      </div>

      {/* BLACK FOOTER */}
      <footer className="footer">
        <h1>Delhi Crime Heatmap</h1>
        <h3>Built with React • Leaflet • MongoDB</h3>
      </footer>

    </div>
  );
}

export default App;